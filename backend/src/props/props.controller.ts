import { Controller, Post, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { PropsService } from './props.service';

@Controller('submissions')
export class PropsController {
  constructor(private readonly propsService: PropsService) {}

  @Post(':id/prop')
  @UseGuards(JwtAuthGuard)
  toggle(@Param('id') id: string, @Request() req: any) {
    return this.propsService.toggle(id, req.user.id);
  }

  @Get(':id/props')
  getState(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.propsService.getState(id, userId);
  }

  @Get(':id/props/who')
  getWho(@Param('id') id: string) {
    return this.propsService.getWho(id);
  }
}
