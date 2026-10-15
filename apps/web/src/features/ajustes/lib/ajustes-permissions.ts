import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canManageAjustes(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin"
    : hasUserPermission(user, "ajustes.actividades.manage");
}
