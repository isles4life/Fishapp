import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { AuditModule } from '../audit/audit.module';
import { PushModule } from '../push/push.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [AuditModule, PushModule, SubmissionsModule],
  providers: [TournamentsService],
  controllers: [TournamentsController],
  exports: [TournamentsService],
})
export class TournamentsModule {}
