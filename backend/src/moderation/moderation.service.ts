import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubmissionStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { EmailService } from '../email/email.service';
import { PushService } from '../push/push.service';
import { S3Service } from '../submissions/s3.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaderboard: LeaderboardService,
    private readonly email: EmailService,
    private readonly push: PushService,
    private readonly s3: S3Service,
    private readonly tournaments: TournamentsService,
  ) {}

  async getPendingSubmissions(tournamentId?: string) {
    const submissions = await this.prisma.submission.findMany({
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

    return Promise.all(submissions.map(async (s) => ({
      ...s,
      photo1Url: s.photo1Key ? await this.s3.getPresignedUrl(s.photo1Key) : null,
      photo2Url: s.photo2Key ? await this.s3.getPresignedUrl(s.photo2Key) : null,
    })));
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
      include: {
        user: { select: { id: true, email: true, displayName: true, pushToken: true } },
        tournament: { select: { name: true } },
      },
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

    // If approved, update leaderboard + create feed post
    if (dto.action === 'APPROVE') {
      await this.leaderboard.onSubmissionApproved(submissionId);
      this.tournaments.createCatchPost(submissionId, submission.tournamentId, submission.userId);
      this.email.sendSubmissionApproved(
        submission.user.email,
        submission.user.displayName,
        submission.tournament.name,
        submission.fishLengthCm,
      );
      if (submission.user.pushToken) {
        this.push.sendToToken(
          submission.user.pushToken,
          'Catch Approved! 🎣',
          `Your ${submission.fishLengthCm} cm catch in ${submission.tournament.name} has been approved.`,
        );
      }
    }

    // If rejected, notify user
    if (dto.action === 'REJECT') {
      this.email.sendSubmissionRejected(
        submission.user.email,
        submission.user.displayName,
        submission.tournament.name,
        dto.note,
      );
      if (submission.user.pushToken) {
        this.push.sendToToken(
          submission.user.pushToken,
          'Catch Not Approved',
          dto.note
            ? `Your catch was not approved: ${dto.note}`
            : 'Your catch submission was not approved.',
        );
      }
    }

    // If suspending user
    if (dto.action === 'SUSPEND_USER') {
      await this.prisma.user.update({
        where: { id: submission.userId },
        data: { suspended: true },
      });
      this.email.sendAccountSuspended(
        submission.user.email,
        submission.user.displayName,
        dto.note,
      );
    }

    return { ok: true, newStatus };
  }

  async moderateBulk(submissionIds: string[], moderatorId: string, dto: ModerateSubmissionDto) {
    const results = await Promise.allSettled(
      submissionIds.map(id => this.moderate(id, moderatorId, dto)),
    );
    return {
      succeeded: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
    };
  }

  async getAllSubmissions(tournamentId?: string, status?: string, page = 1, limit = 50) {
    const where = {
      ...(tournamentId ? { tournamentId } : {}),
      ...(status && status !== 'ALL' ? { status: status as SubmissionStatus } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, email: true } },
          tournament: { select: { id: true, name: true } },
          matSerial: { select: { serialCode: true } },
        },
        skip,
        take: limit,
      }),
      this.prisma.submission.count({ where }),
    ]);
    return { data, total };
  }

  async getFlaggedSubmissions(tournamentIds?: string[]) {
    return this.prisma.submission.findMany({
      where: {
        OR: [{ flagDuplicateHash: true }, { flagDuplicateGps: true }],
        ...(tournamentIds ? { tournamentId: { in: tournamentIds } } : {}),
      },
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}
