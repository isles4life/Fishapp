import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { TournamentAdminService } from './tournament-admin.service';

@Controller()
export class TournamentAdminController {
  constructor(private readonly service: TournamentAdminService) {}

  // ── Angler-facing (any authenticated user) ────────────────────────────────

  @Post('tournament-admin/request')
  @UseGuards(JwtAuthGuard)
  requestRole(
    @Body('tournamentId') tournamentId: string,
    @Body('message') message: string | undefined,
    @Request() req: any,
  ) {
    return this.service.requestRole(req.user.id, tournamentId, message);
  }

  @Get('tournament-admin/my-requests')
  @UseGuards(JwtAuthGuard)
  getMyRequests(@Request() req: any) {
    return this.service.getMyRequests(req.user.id);
  }

  // Returns assigned tournament IDs — used by admin panel on login
  @Get('tournament-admin/my-tournaments')
  @UseGuards(JwtAuthGuard)
  getMyTournaments(@Request() req: any) {
    return this.service.getAssignedTournamentIds(req.user.id);
  }

  // ── Admin-only ────────────────────────────────────────────────────────────

  @Get('admin/tournament-admin/requests')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getPendingRequests() {
    return this.service.getPendingRequests();
  }

  @Patch('admin/tournament-admin/requests/:id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  approve(@Param('id') id: string, @Request() req: any) {
    return this.service.approveRequest(id, req.user.id);
  }

  @Patch('admin/tournament-admin/requests/:id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  reject(@Param('id') id: string, @Body('note') note: string | undefined, @Request() req: any) {
    return this.service.rejectRequest(id, req.user.id, note);
  }
}
