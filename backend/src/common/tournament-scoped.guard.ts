import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TournamentScopedGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.role !== 'ADMIN' && user.role !== 'TOURNAMENT_ADMIN') {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
