import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { WeeklyResetService } from './weekly-reset.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [WebsocketModule, SubmissionsModule],
  providers: [LeaderboardService, WeeklyResetService],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
