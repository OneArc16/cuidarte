import { type AuthUser } from "@cuidarte/contracts";

import { type AdultosMayoresScope } from "./adulto-mayor.types";

const ADULTOS_MAYORES_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set([
  "super_admin",
  "admin",
  "director",
  "enfermeria",
  "fisioterapeuta",
  "medico",
  "nutricionista",
  "psicologo",
  "recreacionista",
  "trabajadora_social",
]);

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

export function canManageAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return ADULTOS_MAYORES_EDITOR_ROLES.has(user.role);
}

export function canManageAdultosMayoresTrash(user: Pick<AuthUser, "role">): boolean {
  return user.role === "super_admin";
}
