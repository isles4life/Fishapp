import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { PrismaService } from '../common/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    const { id, displayName, email, regionId, authProvider, createdAt } = req.user;
    return { id, displayName, email, regionId, authProvider, createdAt };
  }

  @Get('regions')
  getRegions() {
    return this.prisma.region.findMany({
      select: { id: true, name: true },
    });
  }
}
