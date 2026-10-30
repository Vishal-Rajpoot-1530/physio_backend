import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization ?? '';
    if (!authorization.startsWith('Bearer ')) {
      throw new UnauthorizedException('Panel login required.');
    }

    try {
      const payload = await this.jwt.verifyAsync(authorization.slice(7), {
        secret: process.env.JWT_SECRET,
      });
      if (payload.role !== 'super-admin') {
        throw new UnauthorizedException('Panel login required.');
      }
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Panel session expired. Sign in again.');
    }
  }
}
