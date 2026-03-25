import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { S3Service } from '../submissions/s3.service';
import { PushService } from '../push/push.service';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly push: PushService,
  ) {}

  private async notifyMentions(body: string, authorId: string, authorUsername: string | null) {
    const mentionedUsernames = [...new Set(
      [...body.matchAll(/@(\w+)/g)].map(m => m[1].toLowerCase()),
    )];
    if (mentionedUsernames.length === 0) return;

    const profiles = await this.prisma.anglerProfile.findMany({
      where: { username: { in: mentionedUsernames, mode: 'insensitive' } },
      select: { userId: true, user: { select: { pushToken: true } } },
    });

    const pushes = profiles
      .filter(p => p.userId !== authorId && p.user.pushToken)
      .map(p => this.push.sendToToken(
        p.user.pushToken!,
        'You were mentioned 🎣',
        `@${authorUsername ?? 'Someone'} mentioned you in a comment`,
      ).catch(() => {}));

    await Promise.all(pushes);
  }

  private async resolveComment(c: any) {
    const profilePhotoUrl = await this.s3.resolveProfilePhotoUrl(c.user.profile?.profilePhotoUrl);
    return {
      ...c,
      user: {
        ...c.user,
        profile: c.user.profile
          ? { ...c.user.profile, profilePhotoUrl }
          : null,
      },
    };
  }

  async getComments(submissionId: string) {
    const comments = await this.prisma.catchComment.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
      },
    });
    return Promise.all(comments.map(c => this.resolveComment(c)));
  }

  async addComment(submissionId: string, userId: string, body: string) {
    const comment = await this.prisma.catchComment.create({
      data: { submissionId, userId, body },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
      },
    });
    this.notifyMentions(body, userId, comment.user.profile?.username ?? null).catch(() => {});
    return this.resolveComment(comment);
  }

  async editComment(commentId: string, requestingUserId: string, body: string) {
    const comment = await this.prisma.catchComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== requestingUserId) {
      throw new ForbiddenException('Cannot edit another user\'s comment');
    }
    const updated = await this.prisma.catchComment.update({
      where: { id: commentId },
      data: { body },
      include: { user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } } },
    });
    return this.resolveComment(updated);
  }

  async deleteComment(commentId: string, requestingUserId: string, isAdmin: boolean) {
    const comment = await this.prisma.catchComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (!isAdmin && comment.userId !== requestingUserId) {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }
    await this.prisma.catchComment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
