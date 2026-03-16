import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LeaderboardGateway } from './leaderboard.gateway';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
    }),
  ],
  providers: [LeaderboardGateway],
  exports: [LeaderboardGateway],
})
export class WebsocketModule {}
