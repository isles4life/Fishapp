import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    action: string,
    actorId: string | null,
    actorName: string | null,
    targetId?: string,
    details?: Record<string, any>,
  ) {
    return this.prisma.auditLog.create({
      data: { action, actorId, actorName, targetId, details },
    });
  }

  list(limit = 200) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
