import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [UsersController],
})
export class UsersModule {}
