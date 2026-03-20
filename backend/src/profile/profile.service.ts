import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { S3Service } from '../submissions/s3.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private async computeStats(userId: string) {
    const [approved, leaderboard] = await Promise.all([
      this.prisma.submission.findMany({
        where: { userId, status: 'APPROVED' },
        select: { fishLengthCm: true },
      }),
      this.prisma.leaderboardEntry.findMany({
        where: { userId },
        select: { fishLengthCm: true, rank: true, tournamentId: true },
      }),
    ]);

    const lengths = approved.map(s => s.fishLengthCm);
    const uniqueTournaments = new Set(leaderboard.map(e => e.tournamentId)).size;

    return {
      totalCatches: approved.length,
      totalTournamentsEntered: uniqueTournaments,
      tournamentsWon: leaderboard.filter(e => e.rank === 1).length,
      largestCatchCm: lengths.length ? Math.max(...lengths) : null,
      averageCatchCm: lengths.length
        ? Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10
        : null,
      verifiedCatches: approved.length,
    };
  }

  async upsert(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.anglerProfile.findUnique({ where: { username: dto.username } });
      if (existing && existing.userId !== userId) throw new ConflictException('Username already taken');
    }

    const { birthday, ...rest } = dto;
    const birthdayDate = birthday
      ? new Date(birthday.includes('T') ? birthday : `${birthday}T00:00:00.000Z`)
      : undefined;

    const profile = await this.prisma.anglerProfile.upsert({
      where: { userId },
      create: { userId, username: dto.username ?? `angler_${userId.slice(0, 8)}`, ...rest, ...(birthdayDate ? { birthday: birthdayDate } : {}) },
      update: { ...rest, ...(birthdayDate ? { birthday: birthdayDate } : {}), lastActiveAt: new Date() },
      include: { achievements: true, user: { select: { displayName: true, createdAt: true } } },
    });

    const stats = await this.computeStats(userId);
    const profilePhotoUrl = await this.s3.resolveProfilePhotoUrl(profile.profilePhotoUrl);
    return { ...profile, stats, profilePhotoUrl };
  }

  async getOwn(userId: string) {
    const profile = await this.prisma.anglerProfile.findUnique({
      where: { userId },
      include: { achievements: true, user: { select: { displayName: true, createdAt: true } } },
    });

    if (!profile) throw new NotFoundException('no_profile');

    const stats = await this.computeStats(userId);
    const profilePhotoUrl = await this.s3.resolveProfilePhotoUrl(profile.profilePhotoUrl);
    return { ...profile, stats, profilePhotoUrl };
  }

  async getByUsername(username: string, viewerUserId?: string) {
    const profile = await this.prisma.anglerProfile.findUnique({
      where: { username },
      include: { achievements: true, user: { select: { displayName: true, createdAt: true } } },
    });

    if (!profile) throw new NotFoundException('Profile not found');
    if (!profile.publicProfile && profile.userId !== viewerUserId) {
      throw new ForbiddenException('This profile is private');
    }

    if (profile.userId !== viewerUserId) {
      this.prisma.anglerProfile
        .update({ where: { username }, data: { profileViews: { increment: 1 } } })
        .catch(() => {});
    }

    const stats = await this.computeStats(profile.userId);

    let isFollowing = false;
    if (viewerUserId) {
      const viewerProfile = await this.prisma.anglerProfile.findUnique({
        where: { userId: viewerUserId },
        select: { id: true },
      });
      if (viewerProfile) {
        const follow = await this.prisma.follower.findUnique({
          where: { actorId_targetId: { actorId: viewerProfile.id, targetId: profile.id } },
        });
        isFollowing = !!follow;
      }
    }

    const profilePhotoUrl = await this.s3.resolveProfilePhotoUrl(profile.profilePhotoUrl);
    return { ...profile, stats, isFollowing, profilePhotoUrl };
  }

  async follow(actorUserId: string, targetUsername: string) {
    const [actor, target] = await Promise.all([
      this.prisma.anglerProfile.findUnique({ where: { userId: actorUserId }, select: { id: true } }),
      this.prisma.anglerProfile.findUnique({ where: { username: targetUsername }, select: { id: true, allowFollowers: true } }),
    ]);

    if (!actor) throw new NotFoundException('Set up your profile before following others');
    if (!target) throw new NotFoundException('Profile not found');
    if (!target.allowFollowers) throw new ForbiddenException('This angler does not accept followers');
    if (actor.id === target.id) throw new ConflictException('Cannot follow yourself');

    await this.prisma.$transaction([
      this.prisma.follower.create({ data: { actorId: actor.id, targetId: target.id } }),
      this.prisma.anglerProfile.update({ where: { id: actor.id }, data: { followingCount: { increment: 1 } } }),
      this.prisma.anglerProfile.update({ where: { id: target.id }, data: { followersCount: { increment: 1 } } }),
    ]);

    return { following: true };
  }

  async unfollow(actorUserId: string, targetUsername: string) {
    const [actor, target] = await Promise.all([
      this.prisma.anglerProfile.findUnique({ where: { userId: actorUserId }, select: { id: true } }),
      this.prisma.anglerProfile.findUnique({ where: { username: targetUsername }, select: { id: true } }),
    ]);

    if (!actor || !target) throw new NotFoundException('Profile not found');

    const deleted = await this.prisma.follower.deleteMany({
      where: { actorId: actor.id, targetId: target.id },
    });

    if (deleted.count > 0) {
      await Promise.all([
        this.prisma.anglerProfile.update({ where: { id: actor.id }, data: { followingCount: { decrement: 1 } } }),
        this.prisma.anglerProfile.update({ where: { id: target.id }, data: { followersCount: { decrement: 1 } } }),
      ]);
    }

    return { following: false };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'; // heic/heif fall through to jpg
    const key = `avatars/${userId}.${ext}`;
    // Upload without ACL — bucket has Object Ownership: Bucket owner enforced
    await this.s3.uploadBuffer(key, file.buffer, file.mimetype);

    // Store the S3 key (not a public URL) — presigned URLs are generated on fetch
    await this.prisma.anglerProfile.upsert({
      where: { userId },
      create: { userId, username: `angler_${userId.slice(0, 8)}`, profilePhotoUrl: key },
      update: { profilePhotoUrl: key },
    });

    // Return a fresh presigned URL for immediate display by the client
    const avatarUrl = await this.s3.getPresignedUrl(key, 3600);
    return { avatarUrl };
  }

  async grantBadge(userId: string, badge: string) {
    const profile = await this.prisma.anglerProfile.findUnique({ where: { userId }, select: { id: true, badges: true } });
    if (!profile || profile.badges.includes(badge)) return;

    await this.prisma.$transaction([
      this.prisma.anglerProfile.update({ where: { userId }, data: { badges: { push: badge } } }),
      this.prisma.achievement.create({ data: { profileId: profile.id, badge } }),
    ]);
  }
}
