import {
  Controller, Post, Get, Patch, Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { WarningsService } from './warnings.service';

@Controller()
export class WarningsController {
  constructor(private readonly warningsService: WarningsService) {}

  @Post('admin/warnings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  issueWarning(
    @Body() body: { userId: string; level: 'MINOR' | 'MAJOR' | 'FINAL'; reason: string },
    @Request() req: any,
  ) {
    return this.warningsService.issueWarning(body.userId, req.user.id, body.level, body.reason);
  }

  @Get('admin/warnings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getUserWarnings(@Query('userId') userId: string) {
    return this.warningsService.getUserWarnings(userId);
  }

  @Get('warnings/mine')
  @UseGuards(JwtAuthGuard)
  getMyWarnings(@Request() req: any) {
    return this.warningsService.getMyWarnings(req.user.id);
  }

  @Patch('warnings/:id/acknowledge')
  @UseGuards(JwtAuthGuard)
  acknowledge(@Param('id') id: string, @Request() req: any) {
    return this.warningsService.acknowledge(id, req.user.id);
  }
}
