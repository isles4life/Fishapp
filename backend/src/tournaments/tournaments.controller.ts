import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Get('history')
  @UseGuards(JwtAuthGuard)
  listClosed() {
    return this.tournamentsService.listClosed();
  }

  @Get('active')
  @UseGuards(JwtAuthGuard)
  getActive() {
    return this.tournamentsService.getFirstOpenTournament();
  }

  @Get(':id')
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

  @Post(':id/draw')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async draw(@Param('id') id: string, @Body() body: { weighted?: boolean }, @Request() req: any) {
    const result = await this.tournamentsService.drawPrizeWinner(id, body.weighted ?? false);
    await this.auditService.log('PRIZE_DRAW', req.user.id, req.user.displayName, id, {
      winner: result.winner.displayName, email: result.winner.email, pool: result.pool, weighted: body.weighted ?? false,
    });
    return result;
  }

  @Post(':id/announce')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async announce(@Param('id') id: string, @Body() body: { title: string; message: string }, @Request() req: any) {
    if (!body.title?.trim() || !body.message?.trim()) throw new BadRequestException('title and message are required');
    const result = await this.tournamentsService.broadcastAnnouncement(id, body.title.trim(), body.message.trim(), req.user.id);
    await this.auditService.log('TOURNAMENT_ANNOUNCED', req.user.id, req.user.displayName, id, { title: body.title, sent: result.sent });
    return result;
  }

  @Patch(':id/check-in-code')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async generateCheckInCode(@Param('id') id: string, @Request() req: any) {
    const result = await this.tournamentsService.generateCheckInCode(id);
    await this.auditService.log('CHECK_IN_CODE_GENERATED', req.user.id, req.user.displayName, id, {});
    return result;
  }

  @Post('check-in')
  @UseGuards(JwtAuthGuard)
  checkIn(@Body('code') code: string, @Request() req: any) {
    if (!code) throw new BadRequestException('code is required');
    return this.tournamentsService.checkIn(code, req.user.id);
  }

  @Get(':id/check-ins')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getCheckIns(@Param('id') id: string) {
    return this.tournamentsService.getCheckIns(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateTournament(
    @Param('id') id: string,
    @Body() body: { description?: string; directorId?: string | null },
    @Request() req: any,
  ) {
    const result = await this.tournamentsService.update(id, body);
    await this.auditService.log('TOURNAMENT_UPDATED', req.user.id, req.user.displayName, id, body);
    return result;
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(FileInterceptor('banner'))
  async uploadBanner(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('banner file is required');
    const result = await this.tournamentsService.uploadBanner(id, file.buffer, file.mimetype);
    await this.auditService.log('TOURNAMENT_BANNER_UPLOADED', req.user.id, req.user.displayName, id, {});
    return result;
  }

  // ── Feed ───────────────────────────────────────────────────────────────────

  @Get(':id/feed')
  @UseGuards(JwtAuthGuard)
  getFeed(@Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.tournamentsService.getFeed(id, cursor);
  }

  @Post(':id/posts')
  @UseGuards(JwtAuthGuard)
  createPost(
    @Param('id') tournamentId: string,
    @Body() body: { body?: string; photoKey?: string; gifUrl?: string },
    @Request() req: any,
  ) {
    if (!body.body?.trim() && !body.photoKey && !body.gifUrl) {
      throw new BadRequestException('post must have text, image, or gif');
    }
    return this.tournamentsService.createPost(
      tournamentId, req.user.id,
      body.body?.trim() ?? '',
      body.photoKey,
      body.gifUrl,
    );
  }

  @Post(':id/posts/media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPostMedia(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('photo is required');
    return this.tournamentsService.uploadPostMedia(id, file.buffer, file.mimetype);
  }
}
