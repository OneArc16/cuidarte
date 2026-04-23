import { type AuthUser } from "@cuidarte/contracts";

import { type AdultosMayoresScope } from "./adulto-mayor.types";

export function resolveAdultosMayoresScope(user: AuthUser): AdultosMayoresScope | null {
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

export function resolveAdultoMayorTenantForCreate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
