import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ModerationActionEnum } from './moderate-submission.dto';

export class BulkModerateDto {
  @IsArray()
  @IsString({ each: true })
  submissionIds: string[];

  @IsEnum(ModerationActionEnum)
  action: ModerationActionEnum;

  @IsOptional()
  @IsString()
  note?: string;
}
