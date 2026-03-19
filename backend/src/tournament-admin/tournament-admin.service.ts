import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { PushService } from '../push/push.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TournamentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly audit: AuditService,
  ) {}

  async requestRole(userId: string, tournamentId: string, message?: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const existing = await this.prisma.tournamentAdminRequest.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
    if (existing && existing.status === 'APPROVED') {
      throw new BadRequestException('You are already a tournament admin for this tournament');
    }
    if (existing && existing.status === 'PENDING') {
      throw new BadRequestException('You already have a pending request for this tournament');
    }

    return this.prisma.tournamentAdminRequest.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      create: { userId, tournamentId, message, status: 'PENDING' },
      update: { status: 'PENDING', message, reviewedById: null, reviewedAt: null },
      include: { tournament: { select: { name: true } } },
    });
  }

  async getMyRequests(userId: string) {
    return this.prisma.tournamentAdminRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { tournament: { select: { id: true, name: true, weekNumber: true, year: true } } },
    });
  }

  async getAssignedTournamentIds(userId: string): Promise<string[]> {
    const requests = await this.prisma.tournamentAdminRequest.findMany({
      where: { userId, status: 'APPROVED' },
      select: { tournamentId: true },
    });
    return requests.map(r => r.tournamentId);
  }

  async getPendingRequests() {
    return this.prisma.tournamentAdminRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        tournament: { select: { id: true, name: true, weekNumber: true, year: true } },
      },
    });
  }

  async approveRequest(requestId: string, adminId: string) {
    const request = await this.prisma.tournamentAdminRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, displayName: true, email: true, pushToken: true } },
        tournament: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

    await this.prisma.$transaction([
      this.prisma.tournamentAdminRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { role: 'TOURNAMENT_ADMIN' },
      }),
    ]);

    if (request.user.pushToken) {
      this.push.sendToToken(
        request.user.pushToken,
        '✅ Tournament Director Approved',
        `You've been approved to manage ${request.tournament.name}.`,
        { type: 'tournament_admin_approved', tournamentId: request.tournamentId },
      ).catch(() => {});
    }

    await this.audit.log('TOURNAMENT_ADMIN_APPROVED', adminId, null, request.userId, {
      tournamentId: request.tournamentId, tournamentName: request.tournament.name,
      userId: request.userId, displayName: request.user.displayName,
    });

    return { ok: true };
  }

  async rejectRequest(requestId: string, adminId: string, note?: string) {
    const request = await this.prisma.tournamentAdminRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, displayName: true, pushToken: true } },
        tournament: { select: { name: true } },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request is not pending');

    await this.prisma.tournamentAdminRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED', reviewedById: adminId, reviewedAt: new Date() },
    });

    if (request.user.pushToken) {
      this.push.sendToToken(
        request.user.pushToken,
        'Tournament Director Request',
        `Your request to manage ${request.tournament.name} was not approved.`,
        { type: 'tournament_admin_rejected' },
      ).catch(() => {});
    }

    await this.audit.log('TOURNAMENT_ADMIN_REJECTED', adminId, null, request.userId, {
      tournamentId: request.tournamentId, tournamentName: request.tournament.name,
      note: note ?? null,
    });

    return { ok: true };
  }
}
