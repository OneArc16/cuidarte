import { type AuthUser } from "@cuidarte/contracts";

export function canImportAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return user.role === "super_admin" || user.role === "admin";
}

export function resolveAdultoMayorImportTenantForValidate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}

export function resolveAdultoMayorImportTenantForConfirm(user: AuthUser, tenantId: string): string | null {
  if (user.role === "super_admin") {
    return tenantId;
  }

  return user.tenantId;
}
