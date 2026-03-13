import {
  Controller, Get, Post, Delete, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('submissions/:id/comments')
  getComments(@Param('id') id: string) {
    return this.commentsService.getComments(id);
  }

  @Post('submissions/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id') id: string,
    @Body('body') body: string,
    @Request() req: any,
  ) {
    return this.commentsService.addComment(id, req.user.id, body);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.commentsService.deleteComment(commentId, req.user.id, isAdmin);
  }
}
