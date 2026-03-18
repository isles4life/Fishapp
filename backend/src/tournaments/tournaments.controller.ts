import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { TournamentsService } from './tournaments.service';
import { AuditService } from '../audit/audit.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(
    private readonly tournamentsService: TournamentsService,
    private readonly auditService: AuditService,
  ) {}

  // Public — web leaderboard uses this
  @Get('open')
  getOpen() {
    return this.tournamentsService.getFirstOpenTournament();
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  listAll() {
    return this.tournamentsService.listAll();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  getActive() {
    return this.tournamentsService.getFirstOpenTournament();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string) {
    return this.tournamentsService.getById(id);
  }

  // Admin-only endpoints
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() dto: CreateTournamentDto, @Request() req: any) {
    const tournament = await this.tournamentsService.create(dto);
    await this.auditService.log('TOURNAMENT_CREATED', req.user.id, req.user.displayName, tournament.id, { name: tournament.name, weekNumber: tournament.weekNumber, year: tournament.year });
    return tournament;
  }

  @Patch(':id/open')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async open(@Param('id') id: string, @Request() req: any) {
    const tournament = await this.tournamentsService.setOpen(id, true);
    await this.auditService.log('TOURNAMENT_OPENED', req.user.id, req.user.displayName, id, { name: tournament.name });
    return tournament;
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async close(@Param('id') id: string, @Request() req: any) {
    const tournament = await this.tournamentsService.setOpen(id, false);
    await this.auditService.log('TOURNAMENT_CLOSED', req.user.id, req.user.displayName, id, { name: tournament.name });
    return tournament;
  }
}
