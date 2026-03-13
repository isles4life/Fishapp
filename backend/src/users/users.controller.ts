import { Controller, Get, Post, Patch, Param, Body, Request, UseGuards, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
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
      await this.auditService.log(
        body.role === 'ADMIN' ? 'USER_PROMOTED_TO_ADMIN' : 'USER_DEMOTED_TO_USER',
        req.user.id, req.user.displayName, id,
        { targetName: updated.displayName, targetEmail: updated.email },
      );
    }
    if (body.suspended !== undefined) {
      await this.auditService.log(
        body.suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
        req.user.id, req.user.displayName, id,
        { targetName: updated.displayName, targetEmail: updated.email },
      );
    }

    return updated;
  }

  // Admin-only: impersonate a user (returns a JWT for that user)
  @Post(':id/impersonate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async impersonateUser(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, displayName: true, email: true },
    });
    if (!target) throw new NotFoundException('User not found');

    await this.auditService.log(
      'USER_IMPERSONATED',
      req.user.id, req.user.displayName, id,
      { targetName: target.displayName, targetEmail: target.email },
    );

    return { token: this.authService.generateToken(target.id), userId: target.id };
  }

  // Admin-only: reset a user's password
  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @Request() req: any,
  ) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: { id: true, displayName: true, email: true },
    });

    await this.auditService.log(
      'USER_PASSWORD_RESET',
      req.user.id, req.user.displayName, id,
      { targetName: updated.displayName, targetEmail: updated.email },
    );

    return { success: true };
  }
}
