import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PropsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
