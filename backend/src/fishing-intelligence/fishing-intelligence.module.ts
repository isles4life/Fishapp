import { Module } from '@nestjs/common';
import { FishingIntelligenceService } from './fishing-intelligence.service';
import { FishingIntelligenceController } from './fishing-intelligence.controller';

@Module({
  providers: [FishingIntelligenceService],
  controllers: [FishingIntelligenceController],
})
export class FishingIntelligenceModule {}
