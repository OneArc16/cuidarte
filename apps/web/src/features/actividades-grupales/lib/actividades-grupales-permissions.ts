import { type AuthUser } from "@cuidarte/contracts";

export function canManageActividadesGrupales(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "auditor";
}

export function canViewActividadesGrupalesTrash(
  user: Pick<AuthUser, "role" | "tenantId">,
): boolean {
  if (user.role === "super_admin") {
    return true;
  }

  return user.role === "admin" && user.tenantId !== null;
}
