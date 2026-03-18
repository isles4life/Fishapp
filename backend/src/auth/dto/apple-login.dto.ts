import { IsString, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identityToken: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
