import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

const NUTRICION_MODULE_ROLES = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "auditor",
  "director",
  "nutricionista",
]);
const NUTRICION_CREATE_ROLES = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "director",
  "nutricionista",
]);

export function canOpenNutricion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? NUTRICION_MODULE_ROLES.has(user.role)
    : hasUserPermission(user, "nutricion.view");
}

export function canCreateNutricion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? NUTRICION_CREATE_ROLES.has(user.role)
    : hasUserPermission(user, "nutricion.create");
}
