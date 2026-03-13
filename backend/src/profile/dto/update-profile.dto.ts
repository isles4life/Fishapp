import {
  IsString, IsOptional, IsBoolean, IsArray, IsEnum,
  IsUrl, MaxLength, MinLength, Matches,
} from 'class-validator';

export enum WaterTypeDto {
  FRESHWATER = 'FRESHWATER',
  SALTWATER = 'SALTWATER',
  BOTH = 'BOTH',
}

export class UpdateProfileDto {
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Username may only contain letters, numbers, and underscores' })
  @IsOptional()
  username?: string;

  @IsString()
  @MaxLength(250)
  @IsOptional()
  bio?: string;

  @IsUrl()
  @IsOptional()
  profilePhotoUrl?: string;

  // Location
  @IsString() @IsOptional() homeState?: string;
  @IsString() @IsOptional() homeCity?: string;
  @IsString() @IsOptional() country?: string;

  // Preferences
  @IsArray() @IsString({ each: true }) @IsOptional() primarySpecies?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() favoriteTechniques?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() favoriteBaits?: string[];

  @IsEnum(WaterTypeDto) @IsOptional() preferredWaterType?: WaterTypeDto;

  // Gear
  @IsString() @IsOptional() favoriteRod?: string;
  @IsString() @IsOptional() favoriteReel?: string;
  @IsString() @IsOptional() favoriteLine?: string;
  @IsString() @IsOptional() favoriteBoat?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() sponsorTags?: string[];

  // Social settings
  @IsBoolean() @IsOptional() allowFollowers?: boolean;
  @IsBoolean() @IsOptional() publicProfile?: boolean;
}
