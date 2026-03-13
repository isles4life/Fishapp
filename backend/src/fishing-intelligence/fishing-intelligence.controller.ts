import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { FishingIntelligenceService } from './fishing-intelligence.service';

@Controller('fishing-intelligence')
@UseGuards(JwtAuthGuard)
export class FishingIntelligenceController {
  constructor(private readonly svc: FishingIntelligenceService) {}

  @Get()
  get(@Query('lat') lat: string, @Query('lon') lon: string) {
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    if (isNaN(latN) || isNaN(lonN)) throw new BadRequestException('lat and lon required');
    return this.svc.getRecommendations(latN, lonN);
  }
}
