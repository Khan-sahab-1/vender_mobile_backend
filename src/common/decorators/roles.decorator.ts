import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
/**
 * Restrict an endpoint to users whose Role.name matches one of the given values.
 * Usage: @Roles('admin', 'inventory_manager')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
