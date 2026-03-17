import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { AdminGuard } from '../common/admin.guard';
import { AuditService } from './audit.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.auditService.list(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
