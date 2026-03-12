import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

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
  getActive(@Request() req: any) {
    return this.tournamentsService.getActiveTournament(req.user.regionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getById(@Param('id') id: string) {
    return this.tournamentsService.getById(id);
  }

  // Admin endpoints
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @Patch(':id/open')
  @UseGuards(JwtAuthGuard)
  open(@Param('id') id: string) {
    return this.tournamentsService.setOpen(id, true);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  close(@Param('id') id: string) {
    return this.tournamentsService.setOpen(id, false);
  }
}
