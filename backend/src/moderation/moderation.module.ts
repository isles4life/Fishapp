import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { TournamentAdminModule } from '../tournament-admin/tournament-admin.module';
import { TournamentsModule } from '../tournaments/tournaments.module';

@Module({
  imports: [LeaderboardModule, EmailModule, PushModule, SubmissionsModule, TournamentAdminModule, TournamentsModule],
  providers: [ModerationService],
  controllers: [ModerationController],
})
export class ModerationModule {}
