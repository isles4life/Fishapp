import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { FishingIntelligenceModule } from './fishing-intelligence/fishing-intelligence.module';
import { TournamentAdminModule } from './tournament-admin/tournament-admin.module';
import { GifModule } from './gif/gif.module';
import { TournamentEntryModule } from './tournament-entry/tournament-entry.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Global rate limit: 100 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    FishingIntelligenceModule,
    TournamentAdminModule,
    GifModule,
    TournamentEntryModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
