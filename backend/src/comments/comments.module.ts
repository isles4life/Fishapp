import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { SubmissionsModule } from '../submissions/submissions.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [SubmissionsModule, PushModule],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
