import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { WeeklyResetService } from './weekly-reset.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { S3Service } from '../submissions/s3.service';

@Module({
  imports: [WebsocketModule],
  providers: [LeaderboardService, WeeklyResetService, S3Service],
  controllers: [LeaderboardController],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
