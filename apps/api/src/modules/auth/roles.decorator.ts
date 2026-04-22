import { type UserRole } from "@cuidarte/contracts";
import { SetMetadata } from "@nestjs/common";

export const REQUIRED_ROLES_KEY = "requiredRoles";

export const RequireRoles = (...roles: UserRole[]) => SetMetadata(REQUIRED_ROLES_KEY, roles);
