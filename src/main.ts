import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

function isLocalhostOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      url.origin === origin
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api/v1');
  app.use(helmet({ crossOriginResourcePolicy: false }));

  const configuredOrigins = new Set(
    (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  );
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      callback(
        null,
        origin !== undefined &&
          (configuredOrigins.has(origin) || isLocalhostOrigin(origin)),
      );
    },
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = Number(process.env.PORT || 3002);
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log('Physio API listening on ' + `${host}:${port}`);
}
bootstrap();
