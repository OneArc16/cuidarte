import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canViewEquipos(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return (
    user.role === "super_admin" ||
    hasUserPermission(user, "empleados.view") ||
    hasUserPermission(user, "empleados.create") ||
    hasUserPermission(user, "empleados.edit") ||
    hasUserPermission(user, "ajustes.actividades.manage")
  );
}

export function canManageEquipos(user: Pick<AuthUser, "permissions">): boolean {
  return hasUserPermission(user, "ajustes.actividades.manage");
}
