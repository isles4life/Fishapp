import {
  Controller, Get, Post, Delete, Patch, Param, Body, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { CommentsService } from './comments.service';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('submissions/:id/comments')
  getComments(@Param('id') id: string, @Request() req: any) {
    return this.commentsService.getComments(id, req.user?.id);
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

  @Patch('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  editComment(
    @Param('commentId') commentId: string,
    @Body('body') body: string,
    @Request() req: any,
  ) {
    return this.commentsService.editComment(commentId, req.user.id, body);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param('commentId') commentId: string, @Request() req: any) {
    const isAdmin = req.user.role === 'ADMIN';
    return this.commentsService.deleteComment(commentId, req.user.id, isAdmin);
  }

  @Post('comments/:commentId/prop')
  @UseGuards(JwtAuthGuard)
  toggleProp(@Param('commentId') commentId: string, @Request() req: any) {
    return this.commentsService.toggleCatchCommentProp(commentId, req.user.id);
  }

  @Get('comments/:commentId/props/who')
  getCommentProppers(@Param('commentId') commentId: string) {
    return this.commentsService.getCatchCommentProppers(commentId);
  }
}
