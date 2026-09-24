import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canManageActividadGrupalTipos(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return hasUserPermission(user, "ajustes.actividades.manage");
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
