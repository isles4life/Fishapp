import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Req,
  Headers,
  RawBodyRequest,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import { TournamentEntryService } from './tournament-entry.service';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';

@Controller()
export class TournamentEntryController {
  constructor(private readonly service: TournamentEntryService) {}

  // Angler: create PaymentIntent for a paid tournament
  @UseGuards(JwtAuthGuard)
  @Post('tournaments/:id/entry/intent')
  createIntent(@Req() req: any, @Param('id') tournamentId: string) {
    return this.service.createPaymentIntent(req.user.id, tournamentId);
  }

  // Angler: check own entry status
  @UseGuards(JwtAuthGuard)
  @Get('tournaments/:id/entry/me')
  getMyEntry(@Req() req: any, @Param('id') tournamentId: string) {
    return this.service.getMyEntry(req.user.id, tournamentId);
  }

  // Admin: list all entries for a tournament
  @UseGuards(AdminGuard)
  @Get('admin/tournaments/:id/entries')
  getTournamentEntries(@Param('id') tournamentId: string) {
    return this.service.getTournamentEntries(tournamentId);
  }

  // Admin: manually mark an entry as paid
  @UseGuards(AdminGuard)
  @Patch('admin/tournaments/:id/entries/:userId/mark-paid')
  markEntryPaid(@Param('id') tournamentId: string, @Param('userId') userId: string) {
    return this.service.markEntryPaid(tournamentId, userId);
  }

  // Stripe webhook — no auth, raw body required
  @Post('webhooks/stripe')
  @HttpCode(200)
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.service.handleWebhook(req.rawBody!, sig);
  }
}
