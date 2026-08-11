import { adultosMayoresImportAccessRoleValues, type AuthUser } from "@cuidarte/contracts";

const ADULTOS_MAYORES_IMPORT_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  adultosMayoresImportAccessRoleValues,
);

export function canImportAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return ADULTOS_MAYORES_IMPORT_ACCESS_ROLES.has(user.role);
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

export function isRequestedAdultoMayorImportTenantAllowed(
  user: AuthUser,
  requestedTenantId: string | null,
): boolean {
  return (
    user.role === "super_admin" || requestedTenantId === null || requestedTenantId === user.tenantId
  );
}
