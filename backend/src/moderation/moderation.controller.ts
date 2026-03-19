import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { TournamentScopedGuard } from '../common/tournament-scoped.guard';
import { TournamentAdminService } from '../tournament-admin/tournament-admin.service';
import { ModerationService } from './moderation.service';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';
import { BulkModerateDto } from './dto/bulk-moderate.dto';

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, TournamentScopedGuard)
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly tournamentAdminService: TournamentAdminService,
  ) {}

  @Get('submissions')
  async getAllSubmissions(
    @Query('tournamentId') tournamentId: string | undefined,
    @Query('status') status: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Request() req: any,
  ) {
    const effectiveTournamentId = await this.scopedTournamentId(req, tournamentId);
    return this.moderationService.getAllSubmissions(
      effectiveTournamentId,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('pending')
  async getPending(@Query('tournamentId') tournamentId: string | undefined, @Request() req: any) {
    const effectiveTournamentId = await this.scopedTournamentId(req, tournamentId);
    return this.moderationService.getPendingSubmissions(effectiveTournamentId);
  }

  @Get('flagged')
  async getFlagged(@Request() req: any) {
    if (req.user.role === 'TOURNAMENT_ADMIN') {
      const ids = await this.tournamentAdminService.getAssignedTournamentIds(req.user.id);
      return this.moderationService.getFlaggedSubmissions(ids.length > 0 ? ids : undefined);
    }
    return this.moderationService.getFlaggedSubmissions();
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.moderationService.getSubmissionDetail(id);
  }

  @Post('bulk')
  moderateBulk(@Body() dto: BulkModerateDto, @Request() req: any) {
    return this.moderationService.moderateBulk(dto.submissionIds, req.user.id, {
      action: dto.action,
      note: dto.note,
    });
  }

  @Post(':id/action')
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateSubmissionDto,
    @Request() req: any,
  ) {
    return this.moderationService.moderate(id, req.user.id, dto);
  }

  private async scopedTournamentId(req: any, requested: string | undefined): Promise<string | undefined> {
    if (req.user.role !== 'TOURNAMENT_ADMIN') return requested;
    const ids = await this.tournamentAdminService.getAssignedTournamentIds(req.user.id);
    if (ids.length === 0) return '__none__'; // returns empty results
    if (requested && ids.includes(requested)) return requested;
    return ids[0]; // default to first assigned
  }
}
