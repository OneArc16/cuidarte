import { type AuthUser } from "@cuidarte/contracts";

const EMPLEADOS_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set([
  "super_admin",
  "admin",
  "auditor",
]);
const EMPLEADOS_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(["super_admin", "admin"]);

export function canOpenEmpleados(user: Pick<AuthUser, "role">): boolean {
  return EMPLEADOS_ACCESS_ROLES.has(user.role);
}

export function canManageEmpleados(user: Pick<AuthUser, "role">): boolean {
  return EMPLEADOS_EDITOR_ROLES.has(user.role);
}
