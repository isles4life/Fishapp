import { IsUUID, IsNumber, IsString, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  tournamentId: string;

  @IsOptional()
  @IsString()
  matSerialCode?: string;

  @IsNumber()
  @Min(10)
  @Max(300)
  fishLengthCm: number;

  @IsNumber()
  @Min(-90)
  @Max(90)
  gpsLat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  gpsLng: number;

  @IsDateString()
  capturedAt: string;

  @IsOptional()
  @IsString()
  speciesName?: string;

  @IsOptional()
  @IsString()
  speciesCategory?: string;
}
