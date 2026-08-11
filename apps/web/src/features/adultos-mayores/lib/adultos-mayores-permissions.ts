import { adultosMayoresImportAccessRoleValues, type AuthUser } from "@cuidarte/contracts";

const ADULTOS_MAYORES_IMPORT_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  adultosMayoresImportAccessRoleValues,
);

export function canManageAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "auditor";
}

export function canImportAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return ADULTOS_MAYORES_IMPORT_ACCESS_ROLES.has(user.role);
}
