import { type AuthUser } from "@cuidarte/contracts";

import { type AlimentacionScope } from "./alimentacion.types";

export function resolveAlimentacionScope(user: AuthUser): AlimentacionScope | null {
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

export function resolveAlimentacionTenantForCreate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
