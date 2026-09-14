import { type AuthUser } from "@cuidarte/contracts";

export function canManageActividadGrupalTipos(user: Pick<AuthUser, "role">): boolean {
  return user.role === "admin" || user.role === "super_admin";
}

export function resolveActividadGrupalTipoTenantId(
  user: Pick<AuthUser, "role" | "tenantId">,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
