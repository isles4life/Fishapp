import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardGateway } from '../websocket/leaderboard.gateway';
import { S3Service } from '../submissions/s3.service';

const TOP_N = 25;

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: LeaderboardGateway,
    private readonly s3: S3Service,
  ) {}

  async onSubmissionApproved(submissionId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { tournament: true },
    });
    if (!submission) return;

    const { tournamentId, userId, fishLengthCm, fishWeightOz } = submission;
    const scoringMethod = submission.tournament.scoringMethod;

    if (scoringMethod === 'LENGTH') {
      const existing = await this.prisma.leaderboardEntry.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
      });
      if (!existing || fishLengthCm > existing.fishLengthCm) {
        await this.prisma.leaderboardEntry.upsert({
          where: { tournamentId_userId: { tournamentId, userId } },
          create: { tournamentId, userId, fishLengthCm, score: fishLengthCm, submissionId: submission.id },
          update: { fishLengthCm, score: fishLengthCm, submissionId: submission.id },
        });
      }
    } else if (scoringMethod === 'WEIGHT') {
      const weightOz = fishWeightOz ?? 0;
      const existing = await this.prisma.leaderboardEntry.findUnique({
        where: { tournamentId_userId: { tournamentId, userId } },
      });
      if (!existing || weightOz > existing.score) {
        await this.prisma.leaderboardEntry.upsert({
          where: { tournamentId_userId: { tournamentId, userId } },
          create: { tournamentId, userId, fishLengthCm, score: weightOz, submissionId: submission.id },
          update: { fishLengthCm, score: weightOz, submissionId: submission.id },
        });
      }
    } else if (scoringMethod === 'FISH_COUNT') {
      const count = await this.prisma.submission.count({
        where: { tournamentId, userId, status: 'APPROVED' },
      });
      const latest = await this.prisma.submission.findFirst({
        where: { tournamentId, userId, status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
      });
      if (latest) {
        await this.prisma.leaderboardEntry.upsert({
          where: { tournamentId_userId: { tournamentId, userId } },
          create: { tournamentId, userId, fishLengthCm, score: count, submissionId: latest.id },
          update: { score: count, submissionId: latest.id },
        });
      }
    } else if (scoringMethod === 'SPECIES_COUNT') {
      const approved = await this.prisma.submission.findMany({
        where: { tournamentId, userId, status: 'APPROVED' },
        select: { speciesName: true, id: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      });
      const uniqueSpecies = new Set(approved.map(s => s.speciesName).filter(Boolean));
      const count = Math.max(uniqueSpecies.size, 1);
      if (approved[0]) {
        await this.prisma.leaderboardEntry.upsert({
          where: { tournamentId_userId: { tournamentId, userId } },
          create: { tournamentId, userId, fishLengthCm, score: count, submissionId: approved[0].id },
          update: { score: count, submissionId: approved[0].id },
        });
      }
    }

    await this.recomputeRanks(tournamentId);
    const top25 = await this.getTop25(tournamentId);
    this.gateway.broadcastLeaderboardUpdate(tournamentId, top25);
  }

  async getTop25(tournamentId: string, speciesCategory?: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { scoringMethod: true },
    });
    const scoringMethod = tournament?.scoringMethod ?? 'LENGTH';

    const entries = await this.prisma.leaderboardEntry.findMany({
      where: {
        tournamentId,
        ...(speciesCategory ? { submission: { speciesCategory } } : {}),
      },
      orderBy: { score: 'desc' },
      take: TOP_N,
      include: {
        user: {
          select: {
            displayName: true,
            profile: { select: { profilePhotoUrl: true, username: true } },
          },
        },
        submission: {
          select: { speciesName: true, speciesCategory: true, photo1Key: true, createdAt: true, released: true, fishWeightOz: true },
        },
      },
    });

    const mapped = await Promise.all(entries.map(async (e, idx) => {
      let photoUrl: string | null = null;
      if (e.submission?.photo1Key) {
        photoUrl = await this.s3.getPresignedUrl(e.submission.photo1Key, 3600);
      }
      return {
        rank: idx + 1,
        submissionId: e.submissionId,
        userId: e.userId,
        displayName: e.user.displayName,
        fishLengthCm: e.fishLengthCm,
        score: e.score,
        scoringMethod,
        fishWeightOz: e.submission?.fishWeightOz ?? null,
        profilePhotoUrl: e.user.profile?.profilePhotoUrl ?? null,
        username: e.user.profile?.username ?? null,
        speciesName: e.submission?.speciesName ?? null,
        speciesCategory: e.submission?.speciesCategory ?? null,
        photoUrl,
        submittedAt: e.submission?.createdAt?.toISOString() ?? null,
        released: e.submission?.released ?? false,
      };
    }));
    return mapped;
  }

  async getUserRank(tournamentId: string, userId: string) {
    const entry = await this.prisma.leaderboardEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry) return { rank: null, fishLengthCm: null, score: null };
    return { rank: entry.rank, fishLengthCm: entry.fishLengthCm, score: entry.score };
  }

  private async recomputeRanks(tournamentId: string) {
    const entries = await this.prisma.leaderboardEntry.findMany({
      where: { tournamentId },
      orderBy: { score: 'desc' },
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

  async archiveTournament(tournamentId: string) {
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { isOpen: false },
    });
  }
}
