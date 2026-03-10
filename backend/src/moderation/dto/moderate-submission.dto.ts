import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ModerationActionEnum {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  FLAG = 'FLAG',
  SUSPEND_USER = 'SUSPEND_USER',
}

export class ModerateSubmissionDto {
  @IsEnum(ModerationActionEnum)
  action: ModerationActionEnum;

  @IsOptional()
  @IsString()
  note?: string;
}
