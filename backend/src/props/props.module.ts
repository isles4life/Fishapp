import { Module } from '@nestjs/common';
import { PropsService } from './props.service';
import { PropsController } from './props.controller';
import { SubmissionsModule } from '../submissions/submissions.module';

@Module({
  imports: [SubmissionsModule],
  providers: [PropsService],
  controllers: [PropsController],
})
export class PropsModule {}
