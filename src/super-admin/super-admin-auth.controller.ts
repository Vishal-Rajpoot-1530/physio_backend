import {
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'node:crypto';

function matchesSecret(provided: string, configured: string) {
  const providedBytes = Buffer.from(provided);
  const configuredBytes = Buffer.from(configured);
  return (
    providedBytes.length === configuredBytes.length &&
    timingSafeEqual(providedBytes, configuredBytes)
  );
}

@Controller('super-admin/auth')
export class SuperAdminAuthController {
  constructor(private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() body: { email?: unknown; password?: unknown }) {
    const configuredEmail = process.env.PANEL_ADMIN_EMAIL;
    const configuredPassword = process.env.PANEL_ADMIN_PASSWORD;
    const jwtSecret = process.env.JWT_SECRET;
    if (!configuredEmail || !configuredPassword || !jwtSecret) {
      throw new InternalServerErrorException(
        'Panel login is not configured on the backend.',
      );
    }

    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !matchesSecret(email, configuredEmail.trim().toLowerCase()) ||
      !matchesSecret(password, configuredPassword)
    ) {
      throw new UnauthorizedException('Invalid panel email or password.');
    }

    const token = await this.jwt.signAsync(
      { sub: 'super-admin-panel', role: 'super-admin' },
      { secret: jwtSecret, expiresIn: '12h' },
    );
    return { token };
  }
}
