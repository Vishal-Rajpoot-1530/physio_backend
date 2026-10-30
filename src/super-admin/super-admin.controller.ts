import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SuperAdminGuard } from './super-admin.guard';
import { SuperAdminService } from './super-admin.service';


@UseGuards(SuperAdminGuard)
@Controller('super-admin/users')
export class SuperAdminController {

  constructor(
    private readonly superAdminService: SuperAdminService,
  ) {}


  // ==========================================================
  // GET ALL USERS
  // GET /api/v1/super-admin/users
  // ==========================================================

  @Get()
  async getAllUsers() {
    return this.superAdminService.all();
  }


  // ==========================================================
  // GET SINGLE USER
  // GET /api/v1/super-admin/users/:id
  // ==========================================================

  @Get(':id')
  async getUser(
    @Param('id') id: string,
  ) {
    return this.superAdminService.one(
      id,
    );
  }


  // ==========================================================
  // CREATE USER
  // POST /api/v1/super-admin/users
  // ==========================================================

  @Post()
  async createUser(
    @Body() data: any,
  ) {
    return this.superAdminService.createUser(
      data,
    );
  }


  // ==========================================================
  // UPDATE USER
  // PATCH /api/v1/super-admin/users/:id
  // ==========================================================

  @Patch(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.update(
      id,
      data,
    );
  }


  // ==========================================================
  // ACTIVE / INACTIVE USER
  // PATCH /api/v1/super-admin/users/:id/status
  // ==========================================================

  @Patch(':id/status')
  async updateUserStatus(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.status(
      id,
      data.active,
    );
  }


  // ==========================================================
  // ASSIGN SOFTWARE SUBSCRIPTION
  //
  // POST /api/v1/super-admin/users/:id/subscription
  //
  // Flutter sends:
  //
  // {
  //   "planType": "monthly"
  // }
  //
  // OR:
  //
  // {
  //   "planType": "quarterly"
  // }
  //
  // OR:
  //
  // {
  //   "planType": "yearly"
  // }
  // ==========================================================

  @Post(':id/subscription')
  async assignSubscription(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.assign(
      id,
      data.planType,
      false,
    );
  }


  // ==========================================================
  // RENEW SOFTWARE SUBSCRIPTION
  //
  // POST /api/v1/super-admin/users/:id/subscription/renew
  // ==========================================================

  @Post(':id/subscription/renew')
  async renewSubscription(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.assign(
      id,
      data.planType,
      true,
    );
  }


  // ==========================================================
  // RESET PASSWORD
  //
  // POST /api/v1/super-admin/users/:id/reset-password
  //
  // {
  //   "password": "newpassword"
  // }
  // ==========================================================

  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.superAdminService.resetPassword(
      id,
      data.password,
    );
  }
}