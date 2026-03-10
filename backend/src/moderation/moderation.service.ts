import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async getPendingSubmissions(tournamentId?: string) {
    return this.prisma.submission.findMany({
      where: {
        status: 'PENDING',
        ...(tournamentId ? { tournamentId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        tournament: { select: { id: true, name: true } },
        matSerial: { select: { serialCode: true } },
      },
    });
  }

  async getSubmissionDetail(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        user: true,
        tournament: true,
        matSerial: true,
        moderationActions: {
          include: { moderator: { select: { displayName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async moderate(submissionId: string, moderatorId: string, dto: ModerateSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    if (submission.status !== 'PENDING' && submission.status !== 'FLAGGED') {
      throw new BadRequestException('Submission already moderated');
    }

    const newStatus =
      dto.action === 'APPROVE' ? 'APPROVED' : dto.action === 'REJECT' ? 'REJECTED' : 'FLAGGED';

    await this.prisma.$transaction([
      this.prisma.submission.update({
        where: { id: submissionId },
        data: { status: newStatus },
      }),
      this.prisma.moderationAction.create({
        data: {
          submissionId,
          moderatorId,
          actionType: dto.action,
          note: dto.note,
        },
      }),
    ]);

    // If approved, update leaderboard
    if (dto.action === 'APPROVE') {
      await this.leaderboard.onSubmissionApproved(submissionId);
    }

    // If suspending user
    if (dto.action === 'SUSPEND_USER') {
      await this.prisma.user.update({
        where: { id: submission.userId },
        data: { suspended: true },
      });
    }

    return { ok: true, newStatus };
  }

  async getFlaggedSubmissions() {
    return this.prisma.submission.findMany({
      where: { OR: [{ flagDuplicateHash: true }, { flagDuplicateGps: true }] },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
