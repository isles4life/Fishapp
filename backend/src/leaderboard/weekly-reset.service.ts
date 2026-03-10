import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardService } from './leaderboard.service';

@Injectable()
export class WeeklyResetService {
  private readonly logger = new Logger(WeeklyResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  /**
   * Every Sunday at 23:59 UTC – close all open tournaments.
   * Admin manually creates the next week's tournament via dashboard.
   */
  @Cron('59 23 * * 0') // Sunday 23:59 UTC
  async closeWeeklyTournaments() {
    this.logger.log('Running weekly tournament close...');

    const openTournaments = await this.prisma.tournament.findMany({
      where: { isOpen: true },
    });

    for (const tournament of openTournaments) {
      await this.leaderboardService.archiveTournament(tournament.id);
      this.logger.log(`Closed tournament: ${tournament.name} (${tournament.id})`);
    }

    this.logger.log(`Weekly reset complete. Closed ${openTournaments.length} tournament(s).`);
  }
}
