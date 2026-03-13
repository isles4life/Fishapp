import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { PrismaModule } from '../common/prisma.module';
import { S3Service } from '../submissions/s3.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProfileController],
  providers: [ProfileService, S3Service],
  exports: [ProfileService],
})
export class ProfileModule {}
