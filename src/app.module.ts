import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { FinanceModule } from './finance/finance.module';
import { SettingsModule } from './settings/settings.module';
import { CheckinsModule } from './checkins/checkins.module';
import { HealthController } from './health.controller';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import { SuperAdminModule } from './super-admin/super-admin.module';
@Module({imports:[ConfigModule.forRoot({isGlobal:true}),PrismaModule,AuthModule,MembersModule,FinanceModule,SettingsModule,CheckinsModule,SuperAdminModule],controllers:[HealthController]})
export class AppModule implements NestModule { configure(consumer: MiddlewareConsumer){ consumer.apply(RequestLoggerMiddleware).forRoutes('*'); } }
