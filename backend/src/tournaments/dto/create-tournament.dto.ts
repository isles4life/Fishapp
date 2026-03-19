import { IsString, IsUUID, IsInt, IsDateString, IsOptional, IsBoolean, IsObject, Min } from 'class-validator';

export class CreateTournamentDto {
  @IsUUID()
  regionId: string;

  @IsString()
  name: string;

  @IsInt()
  weekNumber: number;

  @IsInt()
  year: number;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  entryFeeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  prizePoolCents?: number;

  @IsOptional()
  @IsObject()
  prizeStructure?: Record<string, any>;

  @IsOptional()
  @IsString()
  scoringMethod?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  directorId?: string;
}
