import { type AuthUser } from "@cuidarte/contracts";

const EMPLEADOS_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set([
  "super_admin",
  "admin",
  "auditor",
  "director",
]);
const EMPLEADOS_CREATOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set([
  "super_admin",
  "admin",
  "director",
]);
const EMPLEADOS_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set([
  "super_admin",
  "admin",
  "director",
]);

export function canOpenEmpleados(user: Pick<AuthUser, "role">): boolean {
  return EMPLEADOS_ACCESS_ROLES.has(user.role);
}

export function canCreateEmpleados(user: Pick<AuthUser, "role">): boolean {
  return EMPLEADOS_CREATOR_ROLES.has(user.role);
}

export function canEditEmpleados(user: Pick<AuthUser, "role">): boolean {
  return EMPLEADOS_EDITOR_ROLES.has(user.role);
}
