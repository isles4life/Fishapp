import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class TournamentEntryService {
  private stripe: Stripe;
  private platformFeePercent: number;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: '2026-02-25.clover',
    });
    this.platformFeePercent = parseInt(
      process.env.STRIPE_PLATFORM_FEE_PERCENT ?? '15',
      10,
    );
  }

  async createPaymentIntent(userId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    if (!tournament.isOpen)
      throw new BadRequestException('Tournament is not open');
    if (tournament.entryFeeCents === 0)
      throw new BadRequestException('This tournament has no entry fee');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.suspended) throw new ForbiddenException('Account suspended');

    // Idempotent — return existing PENDING intent if one already exists
    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
    if (existing?.status === 'PAID') {
      throw new BadRequestException('Already entered this tournament');
    }

    const platformFeeCents = Math.round(
      tournament.entryFeeCents * (this.platformFeePercent / 100),
    );

    const intent = await this.stripe.paymentIntents.create({
      amount: tournament.entryFeeCents,
      currency: 'usd',
      metadata: { userId, tournamentId },
      description: `FishLeague entry fee: ${tournament.name}`,
    });

    // Upsert entry record so retries reuse the same row
    await this.prisma.tournamentEntry.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      create: {
        userId,
        tournamentId,
        stripePaymentIntentId: intent.id,
        feeCents: tournament.entryFeeCents,
        platformFeeCents,
        status: 'PENDING',
      },
      update: {
        stripePaymentIntentId: intent.id,
        status: 'PENDING',
      },
    });

    return {
      clientSecret: intent.client_secret,
      entryFeeCents: tournament.entryFeeCents,
      platformFeeCents,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.tournamentEntry.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'PAID' },
      });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.tournamentEntry.updateMany({
        where: { stripePaymentIntentId: intent.id, status: 'PENDING' },
        data: { status: 'PENDING' }, // stays PENDING so they can retry
      });
    }

    return { received: true };
  }

  async getMyEntry(userId: string, tournamentId: string) {
    return this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
  }

  async getTournamentEntries(tournamentId: string) {
    return this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markEntryPaid(tournamentId: string, userId: string) {
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
    if (!entry) {
      // Create a comp entry with no payment intent
      return this.prisma.tournamentEntry.create({
        data: {
          userId,
          tournamentId,
          stripePaymentIntentId: `manual_${Date.now()}`,
          feeCents: 0,
          platformFeeCents: 0,
          status: 'PAID',
        },
        include: {
          user: { select: { id: true, displayName: true, profile: { select: { username: true } } } },
        },
      });
    }
    return this.prisma.tournamentEntry.update({
      where: { userId_tournamentId: { userId, tournamentId } },
      data: { status: 'PAID' },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true } } } },
      },
    });
  }
}
