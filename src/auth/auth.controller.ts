import { timingSafeEqual } from 'node:crypto';
import {
  Body,
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  Patch,
  Post,
  Put,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ALLOW_EXPIRED_SUBSCRIPTION, JwtGuard } from './jwt.guard';
import { AuthService } from './auth.service';

class RegisterDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(4) password!: string;
  @IsOptional() @IsIn(['online']) type?: 'online';
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsIn(['monthly', 'quarterly', 'yearly']) planType?:
    | 'monthly'
    | 'quarterly'
    | 'yearly';
}

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class UpdateProfileDto {
  @IsString() @MinLength(1) @MaxLength(120) name!: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(4) newPassword!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private s: AuthService) {}

  private assertProvisioningKey(providedKey?: string) {
    const configuredKey = process.env.SUPER_ADMIN_KEY;
    if (!configuredKey) {
      throw new InternalServerErrorException(
        'Account provisioning is not configured.',
      );
    }

    const provided = Buffer.from(providedKey ?? '');
    const configured = Buffer.from(configuredKey);
    if (
      provided.length !== configured.length ||
      !timingSafeEqual(provided, configured)
    ) {
      throw new UnauthorizedException('Invalid super-admin API key.');
    }
  }

  @Post('register')
  register(
    @Body() d: RegisterDto,
    @Headers('x-super-admin-key') key?: string,
  ) {
    this.assertProvisioningKey(key);
    return this.s.register(d);
  }

  @Post('login')
  login(@Body() d: LoginDto) {
    return this.s.login(d);
  }

  @UseGuards(JwtGuard)
  @SetMetadata(ALLOW_EXPIRED_SUBSCRIPTION, true)
  @Get('profile')
  profile(@Req() r: any) {
    return this.s.getProfile(r.user.id);
  }

  @UseGuards(JwtGuard)
  @Patch('profile')
  updateProfile(@Req() r: any, @Body() d: UpdateProfileDto) {
    return this.s.updateProfile(r.user.id, d.name);
  }

  @UseGuards(JwtGuard)
  @Put('password')
  changePassword(@Req() r: any, @Body() d: ChangePasswordDto) {
    return this.s.changePassword(r.user.id, d.currentPassword, d.newPassword);
  }
}