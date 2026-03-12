import { Controller, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../common/prisma.service';

@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Request() req: any) {
    const { id, displayName, email, regionId, authProvider, role, suspended, createdAt } = req.user;
    return { id, displayName, email, regionId, authProvider, role, suspended, createdAt };
  }

  @Get('regions')
  getRegions() {
    return this.prisma.region.findMany({
      select: { id: true, name: true },
    });
  }

  // Admin-only: list all users
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  listAll() {
    return this.prisma.user.findMany({
      select: { id: true, displayName: true, email: true, role: true, suspended: true, authProvider: true, createdAt: true, region: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin-only: update role or suspended status
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  updateUser(@Param('id') id: string, @Body() body: { role?: 'USER' | 'ADMIN'; suspended?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, displayName: true, email: true, role: true, suspended: true },
    });
  }
}
