import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
  }

  async listAll() {
    return this.prisma.tournament.findMany({
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: { region: { select: { name: true } } },
    });
  }

  async setOpen(id: string, isOpen: boolean) {
    return this.prisma.tournament.update({
      where: { id },
      data: { isOpen },
      include: { region: { select: { name: true } } },
    });
  }
}
