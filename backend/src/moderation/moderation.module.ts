import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { EmailModule } from '../email/email.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [LeaderboardModule, EmailModule, PushModule],
  providers: [ModerationService],
  controllers: [ModerationController],
})
export class ModerationModule {}
