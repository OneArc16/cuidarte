import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canManageActividadGrupalTipos(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return hasUserPermission(user, "ajustes.actividades.manage");
}

export function canViewActividadGrupalTipos(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return (
    user.role === "super_admin" ||
    hasUserPermission(user, "actividades_grupales.view") ||
    hasUserPermission(user, "actividades_grupales.create") ||
    hasUserPermission(user, "actividades_grupales.edit") ||
    hasUserPermission(user, "ajustes.actividades.manage")
  );
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
