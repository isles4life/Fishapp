import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getComments(submissionId: string) {
    return this.prisma.catchComment.findMany({
      where: { submissionId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true } },
      },
    });
  }

  async addComment(submissionId: string, userId: string, body: string) {
    return this.prisma.catchComment.create({
      data: { submissionId, userId, body },
      include: {
        user: { select: { id: true, displayName: true } },
      },
    });
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
