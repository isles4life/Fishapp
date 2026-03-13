import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardGateway } from '../websocket/leaderboard.gateway';

const TOP_N = 25;

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LeaderboardGateway,
  ) {}

  /**
   * Called after moderation approves a submission.
   * Upserts the leaderboard entry (keeps longest fish per user),
   * recomputes ranks, and broadcasts update via WebSocket.
   */
  async onSubmissionApproved(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) return;

    // Upsert: keep best (longest) fish per user per tournament
    const existing = await this.prisma.leaderboardEntry.findUnique({
      where: { tournamentId_userId: { tournamentId: submission.tournamentId, userId: submission.userId } },
    });

    if (!existing || submission.fishLengthCm > existing.fishLengthCm) {
      await this.prisma.leaderboardEntry.upsert({
        where: { tournamentId_userId: { tournamentId: submission.tournamentId, userId: submission.userId } },
        create: {
          tournamentId: submission.tournamentId,
          userId: submission.userId,
          fishLengthCm: submission.fishLengthCm,
          submissionId: submission.id,
        },
        update: {
          fishLengthCm: submission.fishLengthCm,
          submissionId: submission.id,
        },
      });
    }

    await this.recomputeRanks(submission.tournamentId);

    const top25 = await this.getTop25(submission.tournamentId);
    this.gateway.broadcastLeaderboardUpdate(submission.tournamentId, top25);
  }

  async getTop25(tournamentId: string, speciesCategory?: string) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: {
        tournamentId,
        ...(speciesCategory
          ? {
              submission: {
                speciesCategory,
              },
            }
          : {}),
      },
      orderBy: { fishLengthCm: 'desc' },
      take: TOP_N,
      include: {
        user: {
          select: {
            displayName: true,
            profile: { select: { profilePhotoUrl: true, username: true } },
          },
        },
        submission: {
          select: { speciesName: true, speciesCategory: true },
        },
      },
    });

    return entries.map((e, idx) => ({
      rank: idx + 1,
      submissionId: e.submissionId,
      userId: e.userId,
      displayName: e.user.displayName,
      fishLengthCm: e.fishLengthCm,
      profilePhotoUrl: e.user.profile?.profilePhotoUrl ?? null,
      username: e.user.profile?.username ?? null,
      speciesName: e.submission?.speciesName ?? null,
      speciesCategory: e.submission?.speciesCategory ?? null,
    }));
  }

  async getUserRank(tournamentId: string, userId: string) {
    const entry = await this.prisma.leaderboardEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry) return { rank: null, fishLengthCm: null };
    return { rank: entry.rank, fishLengthCm: entry.fishLengthCm };
  }

  /** Recomputes integer ranks ordered by fishLengthCm desc */
  private async recomputeRanks(tournamentId: string) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { tournamentId },
      orderBy: { fishLengthCm: 'desc' },
    });

    await Promise.all(
      entries.map((e, idx) =>
        this.prisma.leaderboardEntry.update({
          where: { id: e.id },
          data: { rank: idx + 1 },
        }),
      ),
    );
  }

  /** Archive + clear leaderboard for a tournament (called by weekly reset) */
  async archiveTournament(tournamentId: string) {
    // Entries remain in DB (historical), tournament is just closed
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { isOpen: false },
    });
  }
}
