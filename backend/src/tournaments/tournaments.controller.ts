import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  
  @Get()
  listAll() {
    return this.tournamentsService.listAll();
  }

  @Get('active')
  getActive(@Request() req: any) {
    return this.tournamentsService.getActiveTournament(req.user.regionId);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.tournamentsService.getById(id);
  }

  // Admin endpoints
  @Post()
  create(@Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(dto);
  }

  @Patch(':id/open')
  open(@Param('id') id: string) {
    return this.tournamentsService.setOpen(id, true);
  }

  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.tournamentsService.setOpen(id, false);
  }
}
