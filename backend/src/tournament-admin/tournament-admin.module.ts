import { Module } from '@nestjs/common';
import { TournamentAdminController } from './tournament-admin.controller';
import { TournamentAdminService } from './tournament-admin.service';
import { PrismaModule } from '../common/prisma.module';
import { PushModule } from '../push/push.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, PushModule, AuditModule],
  controllers: [TournamentAdminController],
  providers: [TournamentAdminService],
  exports: [TournamentAdminService],
})
export class TournamentAdminModule {}
