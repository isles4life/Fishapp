import { IsEmail, IsString, MinLength, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  displayName: string;

  @IsUUID()
  regionId: string;

  @IsOptional()
  @IsDateString()
  termsAcceptedAt?: string;
}
