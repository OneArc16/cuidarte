import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

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

export function canOpenEmpleados(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? EMPLEADOS_ACCESS_ROLES.has(user.role)
    : hasUserPermission(user, "empleados.view");
}

export function canCreateEmpleados(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? EMPLEADOS_CREATOR_ROLES.has(user.role)
    : hasUserPermission(user, "empleados.create");
}

export function canEditEmpleados(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? EMPLEADOS_CREATOR_ROLES.has(user.role)
    : hasUserPermission(user, "empleados.edit");
}

export function canManageEmpleadoPermissions(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.role === "admin" || user.role === "super_admin";
}
