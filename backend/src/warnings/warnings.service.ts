import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class WarningsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async issueWarning(
    userId: string,
    adminId: string,
    level: 'MINOR' | 'MAJOR' | 'FINAL',
    reason: string,
  ) {
    const [user, admin] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.user.findUnique({ where: { id: adminId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');

    const warning = await this.prisma.userWarning.create({
      data: { userId, issuedById: adminId, level, reason },
    });

    await this.auditService.log(
      'USER_WARNING_ISSUED',
      adminId,
      admin?.displayName ?? null,
      userId,
      { targetName: user.displayName, level, reason },
    );

    return warning;
  }

  async getUserWarnings(userId: string) {
    return this.prisma.userWarning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        issuedBy: { select: { displayName: true } },
      },
    });
  }

  async getMyWarnings(userId: string) {
    return this.prisma.userWarning.findMany({
      where: { userId, acknowledged: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledge(warningId: string, userId: string) {
    const warning = await this.prisma.userWarning.findUnique({
      where: { id: warningId },
    });
    if (!warning) throw new NotFoundException('Warning not found');
    if (warning.userId !== userId) throw new ForbiddenException('Cannot acknowledge another user\'s warning');
    return this.prisma.userWarning.update({
      where: { id: warningId },
      data: { acknowledged: true },
    });
  }
}
