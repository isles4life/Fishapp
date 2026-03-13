import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsUUID()
  regionId: string;

  @IsOptional()
  @IsString()
  platform?: string;
}
