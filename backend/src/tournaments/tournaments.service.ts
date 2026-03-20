import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../common/prisma.service';
import { PushService } from '../push/push.service';
import { S3Service } from '../submissions/s3.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly s3: S3Service,
  ) {}

  async getFirstOpenTournament() {
    const tournament = await this.prisma.tournament.findFirst({
      where: { isOpen: true },
      orderBy: { startsAt: 'desc' },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('No active tournament');
    return tournament;
  }

  async getActiveTournament(regionId: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { regionId, isOpen: true },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('No active tournament in your region');
    return tournament;
  }

  async getById(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        region: true,
        director: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true, profilePhotoUrl: true } },
          },
        },
        _count: {
          select: {
            submissions: { where: { status: 'APPROVED' } },
            checkIns: true,
          },
        },
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const bannerUrl = tournament.bannerKey
      ? await this.s3.getPresignedUrl(tournament.bannerKey, 3600).catch(() => null)
      : null;

    // Top 3 leaderboard entries
    const top3 = await this.prisma.leaderboardEntry.findMany({
      where: { tournamentId: id },
      orderBy: { score: 'desc' },
      take: 3,
      include: {
        user: { select: { displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
      },
    });

    return { ...tournament, top3, bannerUrl };
  }

  // Admin only
  async create(dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        regionId: dto.regionId,
        name: dto.name,
        weekNumber: dto.weekNumber,
        year: dto.year,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
        isOpen: dto.isOpen ?? false,
        entryFeeCents: dto.entryFeeCents ?? 0,
        prizePoolCents: dto.prizePoolCents ?? 0,
        prizeStructure: dto.prizeStructure,
        scoringMethod: (dto.scoringMethod as any) ?? 'LENGTH',
        description: dto.description,
        directorId: dto.directorId,
      },
    });
  }

  async update(id: string, data: {
    name?: string;
    startsAt?: string;
    endsAt?: string;
    entryFeeCents?: number;
    prizePoolCents?: number;
    scoringMethod?: string;
    description?: string;
    directorId?: string | null;
  }) {
    const { startsAt, endsAt, ...rest } = data;
    return this.prisma.tournament.update({
      where: { id },
      data: {
        ...rest,
        ...(startsAt ? { startsAt: new Date(startsAt) } : {}),
        ...(endsAt ? { endsAt: new Date(endsAt) } : {}),
        ...(rest.scoringMethod ? { scoringMethod: rest.scoringMethod as any } : {}),
      },
    });
  }

  async listAll() {
    return this.prisma.tournament.findMany({
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: { region: { select: { name: true } } },
    });
  }

  async listClosed() {
    return this.prisma.tournament.findMany({
      where: { isOpen: false },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
      include: {
        region: { select: { name: true } },
        _count: { select: { submissions: { where: { status: 'APPROVED' } } } },
      },
    });
  }

  async setOpen(id: string, isOpen: boolean) {
    return this.prisma.tournament.update({
      where: { id },
      data: { isOpen },
      include: { region: { select: { name: true } } },
    });
  }

  async drawPrizeWinner(id: string, weighted: boolean): Promise<{
    winner: { userId: string; displayName: string; email: string };
    pool: number;
  }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const submissions = await this.prisma.submission.findMany({
      where: { tournamentId: id, status: 'APPROVED' },
      select: { user: { select: { id: true, displayName: true, email: true } } },
    });

    if (submissions.length === 0) throw new NotFoundException('No approved submissions in this tournament');

    // Build pool: weighted = 1 entry per catch, unweighted = 1 entry per unique user
    type PoolEntry = { userId: string; displayName: string; email: string };
    const toEntry = (u: { id: string; displayName: string; email: string }): PoolEntry =>
      ({ userId: u.id, displayName: u.displayName, email: u.email });

    let pool: PoolEntry[];
    if (weighted) {
      pool = submissions.map(s => toEntry(s.user));
    } else {
      const seen = new Set<string>();
      pool = submissions
        .map(s => s.user)
        .filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; })
        .map(toEntry);
    }

    const winner = pool[Math.floor(Math.random() * pool.length)];
    return { winner, pool: pool.length };
  }

  async generateCheckInCode(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    const checkInCode = uuid();
    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { checkInCode },
      select: { id: true, checkInCode: true },
    });
  }

  async checkIn(code: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { checkInCode: code },
      include: { region: { select: { name: true } } },
    });
    if (!tournament) throw new NotFoundException('Invalid check-in code');
    if (!tournament.isOpen) throw new BadRequestException('Tournament is not currently open');

    const isNew = !(await this.prisma.tournamentCheckIn.findUnique({
      where: { userId_tournamentId: { userId, tournamentId: tournament.id } },
    }));

    await this.prisma.tournamentCheckIn.upsert({
      where: { userId_tournamentId: { userId, tournamentId: tournament.id } },
      create: { userId, tournamentId: tournament.id },
      update: {},
    });

    // Auto-post check-in to the tournament feed (only on first check-in)
    if (isNew) {
      await this.prisma.tournamentPost.create({
        data: { tournamentId: tournament.id, userId, type: 'CHECK_IN' },
      }).catch(() => { /* non-critical */ });
    }

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        weekNumber: tournament.weekNumber,
        region: tournament.region?.name ?? 'All Regions',
        endsAt: tournament.endsAt,
      },
    };
  }

  async getCheckIns(tournamentId: string) {
    const checkIns = await this.prisma.tournamentCheckIn.findMany({
      where: { tournamentId },
      orderBy: { checkedInAt: 'desc' },
      include: { user: { select: { displayName: true, email: true } } },
    });
    return { count: checkIns.length, checkIns };
  }

  async broadcastAnnouncement(id: string, title: string, message: string, actorId: string): Promise<{ sent: number }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found');

    // Find all unique participants with a push token
    const submissions = await this.prisma.submission.findMany({
      where: { tournamentId: id },
      select: { user: { select: { pushToken: true } } },
      distinct: ['userId'],
    });

    const tokens = submissions
      .map(s => s.user.pushToken)
      .filter((t): t is string => !!t);

    await Promise.all(tokens.map(token =>
      this.push.sendToToken(token, title, message, { type: 'announcement', tournamentId: id })
    ));

    // Write the announcement as a feed post authored by the acting admin/director
    await this.prisma.tournamentPost.create({
      data: { tournamentId: id, userId: actorId, type: 'ANNOUNCEMENT', body: `**${title}**\n${message}` },
    }).catch(() => { /* non-critical */ });

    return { sent: tokens.length };
  }

  async uploadBanner(id: string, buffer: Buffer, contentType: string): Promise<{ bannerUrl: string }> {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament) throw new NotFoundException('Tournament not found');
    const ext = contentType.split('/')[1] ?? 'jpg';
    const key = `tournaments/${id}/banner.${ext}`;
    await this.s3.uploadBuffer(key, buffer, contentType);
    await this.prisma.tournament.update({ where: { id }, data: { bannerKey: key } });
    const bannerUrl = await this.s3.getPresignedUrl(key, 3600);
    return { bannerUrl };
  }

  // ── Feed ──────────────────────────────────────────────────────────────────

  async createPost(
    tournamentId: string,
    userId: string,
    body: string,
    photoKey?: string,
    gifUrl?: string,
  ) {
    // Store gifUrl directly in photoKey field — getFeed will detect https:// and use it as-is
    const storedPhotoKey = gifUrl ?? photoKey ?? undefined;
    const post = await this.prisma.tournamentPost.create({
      data: { tournamentId, userId, type: 'ANGLER_POST', body: body || null, photoKey: storedPhotoKey },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true, profilePhotoUrl: true } },
          },
        },
      },
    });
    let photoUrl: string | null = null;
    if (storedPhotoKey) {
      if (storedPhotoKey.startsWith('https://')) {
        photoUrl = storedPhotoKey;
      } else {
        photoUrl = await this.s3.getPresignedUrl(storedPhotoKey).catch(() => null);
      }
    }
    return { ...post, photoUrl };
  }

  async editPost(postId: string, userId: string, body: string, removePhoto?: boolean) {
    const post = await this.prisma.tournamentPost.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    if (post.userId !== userId) throw new Error('Not authorized');
    if (post.type !== 'ANGLER_POST') throw new Error('Only angler posts can be edited');
    return this.prisma.tournamentPost.update({
      where: { id: postId },
      data: { body, ...(removePhoto ? { photoKey: null } : {}) },
      include: { user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } } },
    });
  }

  async deletePost(postId: string, userId: string, userRole: string) {
    const post = await this.prisma.tournamentPost.findUnique({
      where: { id: postId },
      include: { tournament: { select: { directorId: true } } },
    });
    if (!post) throw new Error('Post not found');
    const isAuthor = post.userId === userId;
    const isAdmin = userRole === 'ADMIN' || userRole === 'TOURNAMENT_ADMIN';
    const isDirector = post.tournament?.directorId === userId;
    if (!isAuthor && !isAdmin && !isDirector) throw new Error('Not authorized');
    await this.prisma.tournamentPost.delete({ where: { id: postId } });
    return { ok: true };
  }

  async uploadPostMedia(tournamentId: string, buffer: Buffer, contentType: string): Promise<{ photoKey: string }> {
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `tournament-posts/${tournamentId}/${Date.now()}.${ext}`;
    await this.s3.uploadBuffer(key, buffer, contentType);
    return { photoKey: key };
  }

  async getFeed(tournamentId: string, cursor?: string) {
    const take = 20;
    const posts = await this.prisma.tournamentPost.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            profile: { select: { username: true, profilePhotoUrl: true } },
          },
        },
        submission: {
          select: {
            id: true,
            fishLengthCm: true,
            fishWeightOz: true,
            speciesName: true,
            released: true,
            photo2Key: true,
          },
        },
      },
    });

    const hasMore = posts.length > take;
    const page = posts.slice(0, take);

    // Add presigned URLs for catch photos and angler post photos
    const withUrls = await Promise.all(
      page.map(async (post) => {
        let photoUrl: string | null = null;
        if (post.type === 'CATCH' && post.submission?.photo2Key) {
          photoUrl = await this.s3.getPresignedUrl(post.submission.photo2Key).catch(() => null);
        } else if (post.type === 'ANGLER_POST' && post.photoKey) {
          if (post.photoKey.startsWith('https://')) {
            photoUrl = post.photoKey; // Direct GIF URL from Giphy
          } else {
            photoUrl = await this.s3.getPresignedUrl(post.photoKey).catch(() => null);
          }
        }
        return { ...post, photoUrl };
      }),
    );

    return {
      posts: withUrls,
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  // Called by moderation service when a submission is approved
  async createCatchPost(submissionId: string, tournamentId: string, userId: string) {
    await this.prisma.tournamentPost.upsert({
      where: { submissionId },
      create: { tournamentId, userId, type: 'CATCH', submissionId },
      update: {},
    }).catch(() => { /* non-critical */ });
  }
}
