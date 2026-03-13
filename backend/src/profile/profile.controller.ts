import {
  Controller, Get, Put, Post, Delete, Body, Param,
  Request, UseGuards, HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /** GET /profile/me — own profile (auth required) */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getOwn(@Request() req: any) {
    return this.profileService.getOwn(req.user.id);
  }

  /** PUT /profile/me — create or update own profile (auth required) */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  upsert(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.upsert(req.user.id, dto);
  }

  /** GET /profile/:username — public profile (anonymous-accessible) */
  @Get(':username')
  getPublic(@Param('username') username: string, @Request() req: any) {
    // req.user is undefined if no JWT; that's fine
    return this.profileService.getByUsername(username, req.user?.id);
  }

  /** POST /profile/:username/follow — follow an angler (auth required) */
  @Post(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  follow(@Param('username') username: string, @Request() req: any) {
    return this.profileService.follow(req.user.id, username);
  }

  /** DELETE /profile/:username/follow — unfollow an angler (auth required) */
  @Delete(':username/follow')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  unfollow(@Param('username') username: string, @Request() req: any) {
    return this.profileService.unfollow(req.user.id, username);
  }
}
