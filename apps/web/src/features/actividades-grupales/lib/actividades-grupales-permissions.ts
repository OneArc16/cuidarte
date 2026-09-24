import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canManageActividadesGrupales(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role !== "auditor"
    : hasUserPermission(user, "actividades_grupales.create") ||
        hasUserPermission(user, "actividades_grupales.edit");
}

export function canViewActividadesGrupalesTrash(
  user: Pick<AuthUser, "role" | "tenantId" | "permissions">,
): boolean {
  if (user.permissions !== undefined && !hasUserPermission(user, "actividades_grupales.delete")) {
    return false;
  }

  if (user.role === "super_admin") {
    return true;
  }

  return user.tenantId !== null && user.role !== "auditor";
}
