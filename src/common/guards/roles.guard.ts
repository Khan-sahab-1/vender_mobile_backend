import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    // Direct role match
    if (user.role && requiredRoles.includes(user.role)) return true;

    // Administrator or company admin has global management authority
    if (
      user.isAdmin ||
      user.role === 'admin' ||
      user.role === 'company_admin' ||
      user.userType === 'company_admin'
    ) {
      return true;
    }

    // Check if user has management level on modules
    const hasManagementAccess = Object.values(user.accessRights || {}).some(
      (level: any) => String(level).toLowerCase() === 'management',
    );
    if (hasManagementAccess && (requiredRoles.includes('management') || requiredRoles.includes('admin'))) {
      return true;
    }

    return false;
  }
}
