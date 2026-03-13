import { Controller, Get, Patch, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
  async updateUser(
    @Param('id') id: string,
    @Body() body: { role?: 'USER' | 'ADMIN'; suspended?: boolean },
    @Request() req: any,
  ) {
    const updated = await this.prisma.user.update({
      where: { id },
      data: body,
      select: { id: true, displayName: true, email: true, role: true, suspended: true },
    });

    if (body.role !== undefined) {
      this.auditService.log(
        body.role === 'ADMIN' ? 'USER_PROMOTED_TO_ADMIN' : 'USER_DEMOTED_TO_USER',
        req.user.id, req.user.displayName, id,
        { targetName: updated.displayName, targetEmail: updated.email },
      );
    }
    if (body.suspended !== undefined) {
      this.auditService.log(
        body.suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        req.user.id, req.user.displayName, id,
        { targetName: updated.displayName, targetEmail: updated.email },
      );
    }

    return updated;
  }
}
