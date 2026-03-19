import { Module } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { AuditModule } from '../audit/audit.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [AuditModule, PushModule],
  providers: [TournamentsService],
  controllers: [TournamentsController],
})
export class TournamentsModule {}
