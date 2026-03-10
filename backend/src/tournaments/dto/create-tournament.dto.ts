import { IsString, IsUUID, IsInt, IsDateString, IsOptional, IsBoolean } from 'class-validator';

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
}
