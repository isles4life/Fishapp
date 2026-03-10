import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*' });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`FishLeague API running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
