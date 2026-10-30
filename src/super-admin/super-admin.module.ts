import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SuperAdminAuthController } from './super-admin-auth.controller';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminGuard } from './super-admin.guard';
import { SuperAdminService } from './super-admin.service';
@Module({
  imports: [JwtModule.register({})],
  controllers: [SuperAdminAuthController, SuperAdminController],
  providers: [SuperAdminService, SuperAdminGuard],
})
export class SuperAdminModule {}
