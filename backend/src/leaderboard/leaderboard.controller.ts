import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  // Public — no auth required for viewing leaderboard
  @Get(':tournamentId')
  getTop25(@Param('tournamentId') tournamentId: string) {
    return this.leaderboardService.getTop25(tournamentId);
  }

  @Get(':tournamentId/me')
  @UseGuards(JwtAuthGuard)
  getMyRank(@Param('tournamentId') tournamentId: string, @Request() req: any) {
    return this.leaderboardService.getUserRank(tournamentId, req.user.id);
  }
}
