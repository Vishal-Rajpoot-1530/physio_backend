const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
require('reflect-metadata');
const { Test } = require('@nestjs/testing');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { SuperAdminService } = require('../dist/super-admin/super-admin.service');
const { SuperAdminController } = require('../dist/super-admin/super-admin.controller');
const { SuperAdminGuard } = require('../dist/super-admin/super-admin.guard');
const { AuthService } = require('../dist/auth/auth.service');
const { AuthController } = require('../dist/auth/auth.controller');
const { PrismaService } = require('../dist/prisma/prisma.service');

// An isolated transactional adapter: tests real Nest routes, auth guards, hashing,
// serialization and rollback orchestration without loading .env or touching a real DB.
class IsolatedDatabase {
  constructor(){this.reset();}
  reset(){this.state={admins:[],plans:[],subscriptions:[]};this.fail=null;}
  view(row,args={}){if(!row)return null;return {...row,...(args.include?{appSubscriptions:this.state.subscriptions.filter(s=>s.adminId===row.id).sort((a,b)=>Number(b.id-a.id)).slice(0,1)}:{})};}
  admin={
    create:async({data})=>{if(this.state.admins.some(a=>a.email===data.email))throw Object.assign(new Error('duplicate'),{code:'P2002'});const row={...data,id:BigInt(this.state.admins.length+1),createdAt:new Date()};this.state.admins.push(row);return {...row};},
    findUnique:async(args)=>this.view(this.state.admins.find(a=>args.where.email?a.email===args.where.email:a.id===args.where.id),args),
    findUniqueOrThrow:async(args)=>{if(this.fail==='read')throw new Error('Injected response read failure');const r=await this.admin.findUnique(args);if(!r)throw new Error('not found');return r;},
    findMany:async(args)=>this.state.admins.map(a=>this.view(a,args)),
    update:async({where,data})=>Object.assign(this.state.admins.find(a=>a.id===where.id),data),
  };
  plan={createMany:async({data})=>{if(this.fail==='plans')throw new Error('Injected plans failure');this.state.plans.push(...data);return{count:data.length};}};
  appSubscription={
    create:async({data})=>{if(this.fail==='subscription')throw new Error('Injected subscription failure');const row={...data,id:BigInt(this.state.subscriptions.length+1)};this.state.subscriptions.push(row);return row;},
    findFirst:async({where})=>this.state.subscriptions.filter(s=>s.adminId===where.adminId&&(!where.status||s.status===where.status)&&(!where.endDate||s.endDate>where.endDate.gt)).sort((a,b)=>b.endDate-a.endDate)[0]??null,
    updateMany:async({where,data})=>{this.state.subscriptions.filter(s=>s.adminId===where.adminId&&s.status===where.status).forEach(s=>Object.assign(s,data));return{count:1};},
  };
  async $transaction(fn){const saved=structuredClone(this.state);try{return await fn(this);}catch(e){this.state=saved;throw e;}}
}
const db=new IsolatedDatabase();let app,url,service;
const key=randomBytes(32).toString('hex');
const input={name:'  QA Gym  ',email:'  Gym.Owner@Example.com ',phone:'9876543210',password:'TestPass123!',type:'online',planType:'quarterly'};
async function request(path,body,secret=key){const response=await fetch(`${url}${path}`,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-super-admin-key':secret},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,body:await response.json()};}
before(async()=>{
 process.env.SUPER_ADMIN_KEY=key;process.env.JWT_SECRET=randomBytes(32).toString('hex');
 const module=await Test.createTestingModule({controllers:[SuperAdminController,AuthController],providers:[SuperAdminService,SuperAdminGuard,AuthService,JwtService,{provide:PrismaService,useValue:db}]}).compile();
 app=module.createNestApplication({logger:false});app.setGlobalPrefix('api/v1');app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true}));await app.listen(0,'127.0.0.1');url=(await app.getUrl())+'/api/v1';service=module.get(SuperAdminService);
});
after(async()=>{await app?.close();});
beforeEach(()=>db.reset());
test('one create request saves admin, four business plans and selected software subscription, then manager login succeeds',async()=>{
 const result=await request('/super-admin/users',input);assert.equal(result.status,201);assert.equal(result.body.email,'gym.owner@example.com');assert.equal(result.body.subscription.plan_type,'quarterly');assert.equal(result.body.subscription.price,300);
 assert.equal(db.state.admins.length,1);assert.equal(db.state.plans.length,4);assert.equal(db.state.subscriptions.length,1);assert.notEqual(db.state.admins[0].passwordHash,input.password);
 const listing=await request('/super-admin/users');assert.equal(listing.body[0].id,result.body.id);
 const login=await request('/auth/login',{email:'gym.owner@example.com',password:input.password});assert.equal(login.status,201);assert.ok(login.body.token);assert.equal(login.body.user.id,result.body.id);
});
for(const step of ['plans','subscription','read'])test(`failure during ${step} rolls back every created record`,async()=>{
 db.fail=step;const r=await request('/super-admin/users',input);assert.equal(r.status,500);assert.deepEqual(db.state,{admins:[],plans:[],subscriptions:[]});
});
test('duplicate email returns conflict without extra records',async()=>{
 await request('/super-admin/users',input);const r=await request('/super-admin/users',{...input,email:'GYM.OWNER@example.com'});assert.equal(r.status,409);assert.equal(db.state.admins.length,1);assert.equal(db.state.plans.length,4);assert.equal(db.state.subscriptions.length,1);
});
test('wrong super-admin key is rejected before creating data',async()=>{const r=await request('/super-admin/users',input,'wrong');assert.equal(r.status,401);assert.equal(db.state.admins.length,0);});
test('invalid email or subscription is rejected before writing',async()=>{
 for(const change of [{email:'invalid'},{planType:'__proto__'},{planType:'weekly'},{password:'a'.repeat(73)}]){const r=await request('/super-admin/users',{...input,...change});assert.equal(r.status,400);assert.equal(db.state.admins.length,0);}
});
test('legacy create body gets an active monthly subscription',async()=>{const {planType,...legacy}=input;const r=await request('/super-admin/users',legacy);assert.equal(r.status,201);assert.equal(r.body.subscription.plan_type,'monthly');});
test('status must be a boolean; invalid user IDs are readable errors',async()=>{await assert.rejects(service.status('1','false'),/boolean/);await assert.rejects(service.one('invalid'),/Invalid user ID/);});
test('calendar month additions clamp January 31 correctly',()=>{assert.equal(service.addMonths(new Date('2026-01-31T10:15:00Z'),1).toISOString(),'2026-02-28T10:15:00.000Z');});
test('assigning a shorter plan returns the current plan, not a replaced historical expiry',async()=>{
 const made=await request('/super-admin/users',{...input,planType:'yearly'});
 const updated=await request(`/super-admin/users/${made.body.id}/subscription`,{planType:'monthly'});
 assert.equal(updated.status,201);assert.equal(updated.body.subscription.plan_type,'monthly');assert.equal(updated.body.subscription.status,'active');
 const before=db.state.subscriptions.find(s=>s.status==='active').endDate;
 await request(`/super-admin/users/${made.body.id}/subscription/renew`,{planType:'monthly'});
 const current=db.state.subscriptions.find(s=>s.status==='active');assert.equal(current.startDate.toISOString(),before.toISOString());
});
