import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@repo/shared-types';

export const ROLES_KEY = 'roles';

export interface RolesMetadata {
  roles: UserRole[];
  errorMessage?: string;
}

export const Roles = (roles: UserRole[], errorMessage?: string) =>
  SetMetadata(ROLES_KEY, { roles, errorMessage });
