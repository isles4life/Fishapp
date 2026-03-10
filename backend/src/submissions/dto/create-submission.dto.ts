import { IsUUID, IsNumber, IsString, IsDateString, Min, Max } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  tournamentId: string;

  @IsString()
  matSerialCode: string;

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
}
