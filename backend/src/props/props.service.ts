import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { S3Service } from '../submissions/s3.service';

@Injectable()
export class PropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async toggle(submissionId: string, userId: string): Promise<{ propped: boolean; count: number }> {
    const existing = await this.prisma.catchProp.findUnique({
      where: { submissionId_userId: { submissionId, userId } },
    });

    if (existing) {
      await this.prisma.catchProp.delete({
        where: { submissionId_userId: { submissionId, userId } },
      });
    } else {
      await this.prisma.catchProp.create({
        data: { submissionId, userId },
      });
    }

    const count = await this.prisma.catchProp.count({ where: { submissionId } });
    return { propped: !existing, count };
  }

  async getState(submissionId: string, userId?: string): Promise<{ count: number; userHasPropped: boolean }> {
    const count = await this.prisma.catchProp.count({ where: { submissionId } });
    let userHasPropped = false;
    if (userId) {
      const existing = await this.prisma.catchProp.findUnique({
        where: { submissionId_userId: { submissionId, userId } },
      });
      userHasPropped = !!existing;
    }
    return { count, userHasPropped };
  }

  async getWho(submissionId: string): Promise<{ id: string; displayName: string; profilePhotoUrl: string | null }[]> {
    const props = await this.prisma.catchProp.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            profile: { select: { username: true, profilePhotoUrl: true } },
          },
        },
      },
    });
    return Promise.all(props.map(async p => ({
      id: p.user.id,
      displayName: p.user.profile?.username ?? 'Angler',
      profilePhotoUrl: await this.s3.resolveProfilePhotoUrl(p.user.profile?.profilePhotoUrl),
    })));
  }
}
