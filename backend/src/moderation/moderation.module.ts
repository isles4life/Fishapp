import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [LeaderboardModule, EmailModule],
  providers: [ModerationService],
  controllers: [ModerationController],
})
export class ModerationModule {}
