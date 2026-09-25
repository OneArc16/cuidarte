import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

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
  if (user.permissions !== undefined && !hasUserPermission(user, "adultos_mayores.view")) {
    return null;
  }

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

export function resolveAdultosMayoresTrashScope(
  user: Pick<AuthUser, "role" | "tenantId">,
): AdultosMayoresScope | null {
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

export function canManageAdultosMayores(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ADULTOS_MAYORES_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "adultos_mayores.create") ||
        hasUserPermission(user, "adultos_mayores.edit");
}

export function canManageAdultosMayoresTrash(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin"
    : hasUserPermission(user, "adultos_mayores.delete");
}
