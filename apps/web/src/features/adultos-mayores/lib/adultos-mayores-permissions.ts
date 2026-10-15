import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canManageAdultosMayores(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role !== "auditor"
    : hasUserPermission(user, "adultos_mayores.create") ||
        hasUserPermission(user, "adultos_mayores.edit");
}

export function canImportAdultosMayores(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin" || user.role === "director"
    : hasUserPermission(user, "adultos_mayores.import");
}

export function canManageAdultosMayoresTrash(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin"
    : hasUserPermission(user, "adultos_mayores.delete");
}
