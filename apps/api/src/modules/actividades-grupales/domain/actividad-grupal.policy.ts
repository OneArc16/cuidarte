import { type AuthUser } from "@cuidarte/contracts";

import { type ActividadesGrupalesScope } from "./actividad-grupal.types";

export function resolveActividadesGrupalesScope(user: AuthUser): ActividadesGrupalesScope | null {
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return {
    type: "tenant",
    tenantId: user.tenantId,
  };
}

export function resolveActividadGrupalTenantForCreate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
