import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/jwt.guard';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  // Max 10 submissions per minute per IP
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo1', maxCount: 1 },
      { name: 'photo2', maxCount: 1 },
    ]),
  )
  async create(
    @Request() req: any,
    @Body() dto: CreateSubmissionDto,
    @UploadedFiles() files: { photo1?: Express.Multer.File[]; photo2?: Express.Multer.File[] },
  ) {
    if (!files.photo2?.[0]) {
      throw new BadRequestException('photo2 is required');
    }

    return this.submissionsService.create(
      req.user.id,
      dto,
      files.photo1?.[0]?.buffer ?? null,
      files.photo2[0].buffer,
    );
  }

  // Max 30 identify requests per minute per user
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('identify')
  @UseInterceptors(FileInterceptor('photo'))
  async identify(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('photo required');
    try {
      const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
      const form = new FormData();
      form.append('image', blob, 'fish.jpg');

      const res = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) return { suggestions: [] };

      const data: any = await res.json();
      const suggestions = (data.results ?? [])
        .filter((r: any) => r.taxon?.iconic_taxon_name === 'Actinopterygii')
        .slice(0, 3)
        .map((r: any) => ({
          species: r.taxon.preferred_common_name ?? r.taxon.name,
          confidence: Math.round((r.combined_score ?? r.score ?? 0) * 100),
        }));

      return { suggestions };
    } catch {
      return { suggestions: [] };
    }
  }

  @Get('feed')
  getFeed(@Query('tournamentId') tournamentId: string) {
    if (!tournamentId) throw new BadRequestException('tournamentId required');
    return this.submissionsService.getFeed(tournamentId);
  }

  @Get('hotspots')
  getHotSpots(@Query('tournamentId') tournamentId?: string) {
    return this.submissionsService.getHotSpots(tournamentId);
  }

  @Get('mine')
  getMySubmissions(@Request() req: any, @Query('tournamentId') tournamentId: string) {
    if (!tournamentId) throw new BadRequestException('tournamentId required');
    return this.submissionsService.getMySubmissions(req.user.id, tournamentId);
  }
}
