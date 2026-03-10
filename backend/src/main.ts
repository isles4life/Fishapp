import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' });

  // ALB health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => res.json({ status: 'ok' }));

  await app.listen(process.env.PORT ?? 3000);
  console.log(`FishLeague API running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
