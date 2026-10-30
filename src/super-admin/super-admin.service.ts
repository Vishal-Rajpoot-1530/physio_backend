import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import {
  calculateEndDate,
  PLANS,
  type PlanCode,
} from '../subscriptions/subscription-plans';

import * as bcrypt from 'bcryptjs';
import { isEmail } from 'class-validator';

// ============================================================
// SUPER ADMIN SERVICE
// ============================================================

@Injectable()
export class SuperAdminService {

  constructor(
    private readonly prisma: PrismaService,
  ) {}


  // ==========================================================
  // PRISMA INCLUDE
  // ==========================================================

  private readonly includeSubscription = {
    appSubscriptions: {
      orderBy: [{ createdAt:'desc' as const }, { id:'desc' as const }],
      take: 1,
    },
  };


  // ==========================================================
  // FORMAT SUBSCRIPTION FOR FLUTTER
  // ==========================================================

private formatSubscription(
  subscription: any,
) {
  if (!subscription) {
    return null;
  }

  const isExpired =
    subscription.endDate <= new Date();

  let status =
    String(subscription.status).toLowerCase();

  if (
    status === 'active' &&
    isExpired
  ) {
    status = 'expired';
  }

  return {
    id: Number(
      subscription.id,
    ),

    plan_type:
      String(subscription.plan).toLowerCase(),

    price: Number(
      subscription.price,
    ),

    start_date:
      subscription.startDate.toISOString(),

    expiry_date:
      subscription.endDate.toISOString(),

    status: status,
  };
}
  // ==========================================================
  // FORMAT USER FOR FLUTTER
  // ==========================================================

private formatUser(
  user: any,
) {
  const subscription =
    user.appSubscriptions?.[0] ?? null;

  return {
    id: Number(
      user.id,
    ),

    name: user.name,

    phone: user.phone,

    email: user.email,

    type:
      String(user.type).toLowerCase(),

    status:
      user.isActive
        ? 'active'
        : 'inactive',

    created_at:
      user.createdAt.toISOString(),

    subscription:
      this.formatSubscription(
        subscription,
      ),
  };
}

  // ==========================================================
  // GET ALL USERS
  // ==========================================================

async all() {
  const users = await this.prisma.admin.findMany({
    include: this.includeSubscription,
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users.map((user) => {
    return this.formatUser(user);
  });
}

  // ==========================================================
  // GET SINGLE USER
  // ==========================================================

  async one(
    id: string,
  ) {

    const adminId = this.parseId(id);

    const user =
      await this.prisma.admin.findUnique({
        where: {
          id: adminId,
        },

        include: this.includeSubscription,
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return this.formatUser(
      user,
    );
  }


  // ==========================================================
  // CREATE USER
  // ==========================================================

  async createUser(data: any) {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const password = typeof data.password === 'string' ? data.password : '';
    const type = String(data.type ?? 'online').trim().toLowerCase();
    // Older clients omitted planType and assigned a plan in a second request.
    // Default monthly keeps them compatible while ensuring every new gym is usable.
    const plan = String(data.planType ?? 'monthly').trim().toLowerCase() as PlanCode;
    if (!name || name.length > 120) throw new BadRequestException('Name must contain 1 to 120 characters');
    if (!isEmail(email) || email.length > 190) throw new BadRequestException('Valid email required');
    if (!phone || phone.length > 40) throw new BadRequestException('Phone number must contain 1 to 40 characters');
    if (type !== 'online') throw new BadRequestException('Only online accounts are supported');
    if (password.length < 4 || password.length > 72 || Buffer.byteLength(password,'utf8') > 72) throw new BadRequestException('Password must contain at least 4 characters and at most 72 UTF-8 bytes');
    if (!Object.prototype.hasOwnProperty.call(PLANS,plan)) throw new BadRequestException('Invalid subscription plan');
    const selected = PLANS[plan];
    const passwordHash = await bcrypt.hash(password,12);
    const startDate = new Date();
    const endDate = calculateEndDate(startDate,selected.months);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const admin = await tx.admin.create({data:{name,email,phone,type,isActive:true,passwordHash}});
        await tx.plan.createMany({data:[[1,65],[3,180],[6,340],[12,620]].map(([months,fee])=>({adminId:admin.id,months,fee}))});
        await tx.appSubscription.create({data:{adminId:admin.id,plan,price:selected.price,startDate,endDate,status:'active'}});
        // Serialize the committed result from this same transaction. No second HTTP
        // request or post-commit read can leave a newly-created account half configured.
        const user = await tx.admin.findUniqueOrThrow({where:{id:admin.id},include:this.includeSubscription});
        return this.formatUser(user);
      },{maxWait:5000,timeout:15000});
    } catch(error:any) {
      if(error?.code === 'P2002')throw new ConflictException('Email already registered. Refresh the users list before retrying.');
      throw error;
    }
  }

  // ==========================================================
  // UPDATE USER
  // ==========================================================

  async update(
    id: string,
    data: any,
  ) {

    const adminId = this.parseId(id);


    // --------------------------------------------------------
    // CHECK USER
    // --------------------------------------------------------

    const currentUser =
      await this.prisma.admin.findUnique({
        where: {
          id: adminId,
        },
      });

    if (!currentUser) {
      throw new NotFoundException(
        'User not found',
      );
    }


    const updateData: any = {};


    // --------------------------------------------------------
    // UPDATE NAME
    // --------------------------------------------------------

    if (data.name !== undefined) {

      const name = String(
        data.name,
      ).trim();

      if (!name) {
        throw new BadRequestException(
          'Name required',
        );
      }

      updateData.name = name;
    }


    // --------------------------------------------------------
    // UPDATE PHONE
    // --------------------------------------------------------

    if (data.phone !== undefined) {

      const phone = String(
        data.phone,
      ).trim();

      if (!phone) {
        throw new BadRequestException(
          'Phone number required',
        );
      }

      updateData.phone = phone;
    }


    // --------------------------------------------------------
    // UPDATE TYPE
    // --------------------------------------------------------

    if (data.type !== undefined) {

      const type = String(data.type).toLowerCase();
      if (type !== 'online') {
        throw new BadRequestException(
          'Only online accounts are supported',
        );
      }

      updateData.type = type;
    }


    // --------------------------------------------------------
    // UPDATE EMAIL
    // --------------------------------------------------------

    if (data.email !== undefined) {

      const email = String(
        data.email,
      )
          .trim()
          .toLowerCase();

      if (!email) {
        throw new BadRequestException(
          'Email required',
        );
      }


      const existingUser =
        await this.prisma.admin.findUnique({
          where: {
            email: email,
          },
        });


      if (
        existingUser &&
        existingUser.id !== adminId
      ) {
        throw new ConflictException(
          'Email already registered',
        );
      }


      updateData.email = email;
    }


    // --------------------------------------------------------
    // NOTHING TO UPDATE
    // --------------------------------------------------------

    if (
      Object.keys(
        updateData,
      ).length === 0
    ) {
      throw new BadRequestException(
        'No editable fields supplied',
      );
    }


    // --------------------------------------------------------
    // UPDATE DATABASE
    // --------------------------------------------------------

    await this.prisma.admin.update({
      where: {
        id: adminId,
      },

      data: updateData,
    });


    // --------------------------------------------------------
    // RETURN UPDATED USER
    // --------------------------------------------------------

    return this.one(
      id,
    );
  }


  // ==========================================================
  // ACTIVE / INACTIVE USER
  // ==========================================================

  async status(
    id: string,
    active: boolean,
  ) {

    const adminId = this.parseId(id);


    // --------------------------------------------------------
    // CHECK USER EXISTS
    // --------------------------------------------------------

    if (typeof active !== 'boolean') throw new BadRequestException('active must be a boolean');
    await this.requireUser(adminId);

    // --------------------------------------------------------
    // UPDATE STATUS
    // --------------------------------------------------------

    await this.prisma.admin.update({
      where: {
        id: adminId,
      },

      data: {
        isActive: Boolean(
          active,
        ),
      },
    });


    return {
      success: true,
    };
  }


  // ==========================================================
  // RESET PASSWORD
  // ==========================================================

  async resetPassword(
    id: string,
    password: string,
  ) {

    const adminId = this.parseId(id);


    // --------------------------------------------------------
    // CHECK USER EXISTS
    // --------------------------------------------------------

    await this.requireUser(
      adminId,
    );


    // --------------------------------------------------------
    // PASSWORD VALIDATION
    // --------------------------------------------------------

    const newPassword = String(
      password ?? '',
    );

    if (
      newPassword.length < 4
    ) {
      throw new BadRequestException(
        'Password must be at least 4 characters',
      );
    }


    // --------------------------------------------------------
    // HASH NEW PASSWORD
    // --------------------------------------------------------

    const passwordHash =
      await bcrypt.hash(
        newPassword,
        12,
      );


    // --------------------------------------------------------
    // UPDATE PASSWORD
    // --------------------------------------------------------

    await this.prisma.admin.update({
      where: {
        id: adminId,
      },

      data: {
        passwordHash: passwordHash,
      },
    });


    return {
      success: true,
      message: 'Password reset successfully',
    };
  }


  // ==========================================================
  // ASSIGN / RENEW SOFTWARE SUBSCRIPTION
  // ==========================================================

  async assign(
    id: string,
    planType: PlanCode,
    renew = false,
  ) {

    const adminId = this.parseId(id);


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

    const admin =
      await this.requireUser(
        adminId,
      );


    // --------------------------------------------------------
    // ONLY ONLINE USER CAN HAVE SUBSCRIPTION
    // --------------------------------------------------------

    if (
      admin.type !== 'online'
    ) {
      throw new BadRequestException(
        'Subscription is only available for online users',
      );
    }


    // --------------------------------------------------------
    // NORMALIZE PLAN TYPE
    //
    // Flutter sends:
    // monthly
    // quarterly
    // yearly
    // --------------------------------------------------------

    const normalizedPlan =
      String(
        planType ?? '',
      ).toLowerCase() as PlanCode;


    // --------------------------------------------------------
    // GET PLAN CONFIGURATION
    // --------------------------------------------------------

    const planConfig =
      PLANS[normalizedPlan];


    if (!Object.prototype.hasOwnProperty.call(PLANS, normalizedPlan)) {
      throw new BadRequestException(
        'Invalid subscription plan',
      );
    }


    // --------------------------------------------------------
    // GET LATEST SOFTWARE SUBSCRIPTION
    // --------------------------------------------------------

    const latestSubscription =
      await this.prisma.appSubscription.findFirst({
        where: { adminId: admin.id, status:'active' },
        orderBy: { endDate:'desc' },
      });


    const now = new Date();


    // --------------------------------------------------------
    // CALCULATE START DATE
    //
    // ASSIGN:
    // starts today.
    //
    // RENEW:
    // if existing subscription is still valid,
    // continue from current expiry date.
    // --------------------------------------------------------

    let startDate = new Date(
      now,
    );


    if (
      renew &&
      latestSubscription &&
      latestSubscription.endDate > now
    ) {
      startDate = new Date(
        latestSubscription.endDate,
      );
    }


    // --------------------------------------------------------
    // CALCULATE END DATE
    // --------------------------------------------------------

    const endDate = calculateEndDate(startDate,planConfig.months);


    // --------------------------------------------------------
    // DATABASE TRANSACTION
    // --------------------------------------------------------

    await this.prisma.$transaction(
      async (transaction) => {

        // ----------------------------------------------------
        // MARK PREVIOUS ACTIVE SUBSCRIPTION AS REPLACED
        // ----------------------------------------------------

        await transaction.appSubscription.updateMany({
          where: {
            adminId: admin.id,

            status: 'active',
          },

          data: {
            status: 'replaced',
          },
        });


        // ----------------------------------------------------
        // CREATE NEW SOFTWARE SUBSCRIPTION
        // ----------------------------------------------------

        await transaction.appSubscription.create({
          data: {
            adminId: admin.id,

            plan: normalizedPlan,

            price: planConfig.price,

            startDate: startDate,

            endDate: endDate,

            status: 'active',
          },
        });

      },
    );


    // --------------------------------------------------------
    // RETURN UPDATED USER
    // --------------------------------------------------------

    return this.one(
      id,
    );
  }

  addMonths(date: Date, months: number): Date {
    return calculateEndDate(date, months);
  }


  // ==========================================================
  // REQUIRE USER
  // ==========================================================

  private parseId(id:string):bigint {
    if(!/^[1-9]\d*$/.test(id))throw new BadRequestException('Invalid user ID');
    return BigInt(id);
  }

  private async requireUser(
    id: bigint,
  ) {

    const admin =
      await this.prisma.admin.findUnique({
        where: {
          id: id,
        },
      });


    if (!admin) {
      throw new NotFoundException(
        'User not found',
      );
    }


    return admin;
  }
}