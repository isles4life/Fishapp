import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ModerationModule } from './moderation/moderation.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AuditModule } from './audit/audit.module';
import { ProfileModule } from './profile/profile.module';
import { PropsModule } from './props/props.module';
import { CommentsModule } from './comments/comments.module';
import { WarningsModule } from './warnings/warnings.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TournamentsModule,
    SubmissionsModule,
    LeaderboardModule,
    ModerationModule,
    WebsocketModule,
    AuditModule,
    ProfileModule,
    PropsModule,
    CommentsModule,
    WarningsModule,
  ],
})
export class AppModule {}
