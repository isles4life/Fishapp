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
import { AdminGuard } from '../common/admin.guard';
import { ModerationService } from './moderation.service';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';
import { BulkModerateDto } from './dto/bulk-moderate.dto';

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard, AdminGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('submissions')
  getAllSubmissions(
    @Query('tournamentId') tournamentId?: string,
    @Query('status') status?: string,
  ) {
    return this.moderationService.getAllSubmissions(tournamentId, status);
  }

  @Get('pending')
  getPending(@Query('tournamentId') tournamentId?: string) {
    return this.moderationService.getPendingSubmissions(tournamentId);
  }

  @Get('flagged')
  getFlagged() {
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
}
