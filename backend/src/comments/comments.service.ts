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
    const [profilePhotoUrl, photoUrl] = await Promise.all([
      this.s3.resolveProfilePhotoUrl(c.user.profile?.profilePhotoUrl),
      c.photoKey ? this.s3.getPresignedUrl(c.photoKey) : Promise.resolve(null),
    ]);
    return {
      ...c,
      photoUrl,
      user: {
        ...c.user,
        profile: c.user.profile
          ? { ...c.user.profile, profilePhotoUrl }
          : null,
      },
    };
  }

  async getComments(submissionId: string, requestingUserId?: string) {
    const comments = await this.prisma.catchComment.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
        _count: { select: { props: true } },
      },
    });
    const resolved = await Promise.all(comments.map(c => this.resolveComment(c)));
    if (!requestingUserId) return resolved.map(c => ({ ...c, propCount: (c as any)._count.props, userHasPropped: false }));
    const myProps = await this.prisma.catchCommentProp.findMany({
      where: { userId: requestingUserId, commentId: { in: comments.map(c => c.id) } },
      select: { commentId: true },
    });
    const proppedSet = new Set(myProps.map(p => p.commentId));
    return resolved.map(c => ({ ...c, propCount: (c as any)._count.props, userHasPropped: proppedSet.has(c.id) }));
  }

  async addComment(submissionId: string, userId: string, body: string, gifUrl?: string, photoKey?: string) {
    const comment = await this.prisma.catchComment.create({
      data: { submissionId, userId, body, ...(gifUrl ? { gifUrl } : {}), ...(photoKey ? { photoKey } : {}) },
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
        _count: { select: { props: true } },
      },
    });
    this.notifyMentions(body, userId, comment.user.profile?.username ?? null).catch(() => {});
    const resolved = await this.resolveComment(comment);
    return { ...resolved, propCount: 0, userHasPropped: false };
  }

  async uploadCommentMedia(submissionId: string, buffer: Buffer, contentType: string): Promise<{ photoKey: string }> {
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const key = `catch-comments/${submissionId}/${Date.now()}.${ext}`;
    await this.s3.uploadBuffer(key, buffer, contentType);
    return { photoKey: key };
  }

  async getCatchCommentProppers(commentId: string) {
    const props = await this.prisma.catchCommentProp.findMany({
      where: { commentId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, profile: { select: { username: true, profilePhotoUrl: true } } } } },
    });
    return Promise.all(props.map(async p => ({
      id: p.user.id,
      displayName: p.user.profile?.username ?? 'Angler',
      profilePhotoUrl: await this.s3.resolveProfilePhotoUrl(p.user.profile?.profilePhotoUrl),
    })));
  }

  async toggleCatchCommentProp(commentId: string, userId: string) {
    const existing = await this.prisma.catchCommentProp.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });
    if (existing) {
      await this.prisma.catchCommentProp.delete({ where: { commentId_userId: { commentId, userId } } });
    } else {
      await this.prisma.catchCommentProp.create({ data: { commentId, userId } });
    }
    const propCount = await this.prisma.catchCommentProp.count({ where: { commentId } });
    return { propCount, userHasPropped: !existing };
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
      include: {
        user: { select: { id: true, displayName: true, profile: { select: { username: true, profilePhotoUrl: true } } } },
        _count: { select: { props: true } },
      },
    });
    const resolved = await this.resolveComment(updated);
    return { ...resolved, propCount: (updated as any)._count.props, userHasPropped: true };
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
