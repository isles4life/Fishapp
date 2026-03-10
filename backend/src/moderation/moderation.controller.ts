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
import { ModerationService } from './moderation.service';
import { ModerateSubmissionDto } from './dto/moderate-submission.dto';

// NOTE: In production, add a role guard to restrict to admin users.
// For MVP, admin users are identified by known email; extend as needed.

@Controller('admin/moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

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

  @Post(':id/action')
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateSubmissionDto,
    @Request() req: any,
  ) {
    return this.moderationService.moderate(id, req.user.id, dto);
  }
}
