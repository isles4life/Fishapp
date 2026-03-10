import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/jwt.guard';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto } from './dto/create-submission.dto';

@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

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
    if (!files.photo1?.[0] || !files.photo2?.[0]) {
      throw new BadRequestException('Both photo1 and photo2 are required');
    }

    return this.submissionsService.create(
      req.user.id,
      dto,
      files.photo1[0].buffer,
      files.photo2[0].buffer,
    );
  }

  @Get('mine')
  getMySubmissions(@Request() req: any, @Query('tournamentId') tournamentId: string) {
    if (!tournamentId) throw new BadRequestException('tournamentId required');
    return this.submissionsService.getMySubmissions(req.user.id, tournamentId);
  }
}
