import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { PushService } from '../push/push.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async getFirstOpenTournament() {
    const tournament = await this.prisma.tournament.findFirst({
      where: { isOpen: true },
      orderBy: { startsAt: 'desc' },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('No active tournament');
    return tournament;
  }

  async getActiveTournament(regionId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { regionId, isOpen: true },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('No active tournament in your region');
    return tournament;
  }

  async getById(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  // Admin only
  async create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        regionId: dto.regionId,
        name: dto.name,
        weekNumber: dto.weekNumber,
        year: dto.year,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isOpen: dto.isOpen ?? false,
        entryFeeCents: dto.entryFeeCents ?? 0,
        prizePoolCents: dto.prizePoolCents ?? 0,
        prizeStructure: dto.prizeStructure,
      },
    });
  }

  async listAll() {
    return this.prisma.tournament.findMany({
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: { region: { select: { name: true } } },
    });
  }

  async listClosed() {
    return this.prisma.tournament.findMany({
      where: { isOpen: false },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: {
        region: { select: { name: true } },
        _count: { select: { submissions: { where: { status: 'APPROVED' } } } },
      },
    });
  }

  async setOpen(id: string, isOpen: boolean) {
    return this.prisma.tournament.update({
      where: { id },
      data: { isOpen },
      include: { region: { select: { name: true } } },
    });
  }

  async drawPrizeWinner(id: string, weighted: boolean): Promise<{
    winner: { userId: string; displayName: string; email: string };
    pool: number;
  }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const submissions = await this.prisma.submission.findMany({
      where: { tournamentId: id, status: 'APPROVED' },
      select: { user: { select: { id: true, displayName: true, email: true } } },
    });

    if (submissions.length === 0) throw new NotFoundException('No approved submissions in this tournament');

    // Build pool: weighted = 1 entry per catch, unweighted = 1 entry per unique user
    type PoolEntry = { userId: string; displayName: string; email: string };
    const toEntry = (u: { id: string; displayName: string; email: string }): PoolEntry =>
      ({ userId: u.id, displayName: u.displayName, email: u.email });

    let pool: PoolEntry[];
    if (weighted) {
      pool = submissions.map(s => toEntry(s.user));
    } else {
      const seen = new Set<string>();
      pool = submissions
        .map(s => s.user)
        .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; })
        .map(toEntry);
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];
    return { winner, pool: pool.length };
  }

  async generateCheckInCode(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    const checkInCode = uuid();
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { checkInCode },
      select: { id: true, checkInCode: true },
    });
  }

  async checkIn(code: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { checkInCode: code },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('Invalid check-in code');
    if (!tournament.isOpen) throw new BadRequestException('Tournament is not currently open');

    await this.prisma.tournamentCheckIn.upsert({
      where: { userId_tournamentId: { userId, tournamentId: tournament.id } },
      create: { userId, tournamentId: tournament.id },
      update: {},
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        weekNumber: tournament.weekNumber,
        region: tournament.region?.name ?? 'All Regions',
        endsAt: tournament.endsAt,
      },
    };
  }

  async getCheckIns(tournamentId: string) {
    const checkIns = await this.prisma.tournamentCheckIn.findMany({
      where: { tournamentId },
      orderBy: { checkedInAt: 'desc' },
      include: { user: { select: { displayName: true, email: true } } },
    });
    return { count: checkIns.length, checkIns };
  }

  async broadcastAnnouncement(id: string, title: string, message: string): Promise<{ sent: number }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    // Find all unique participants with a push token
    const submissions = await this.prisma.submission.findMany({
      where: { tournamentId: id },
      select: { user: { select: { id: true, pushToken: true } } },
      distinct: ['userId'],
    });

    const tokens = submissions
      .map(s => s.user.pushToken)
      .filter((t): t is string => !!t);

    await Promise.all(tokens.map(token =>
      this.push.sendToToken(token, title, message, { type: 'announcement', tournamentId: id })
    ));

    return { sent: tokens.length };
  }
}
