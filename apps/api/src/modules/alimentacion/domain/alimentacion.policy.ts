import {
  alimentacionAccessRoleValues,
  hasUserPermission,
  alimentacionEditorRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

import { type AlimentacionScope } from "./alimentacion.types";

const ALIMENTACION_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionAccessRoleValues,
);
const ALIMENTACION_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionEditorRoleValues,
);

export function canAccessAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_ACCESS_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.view");
}

export function canManageAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.create") ||
        hasUserPermission(user, "alimentacion.edit");
}

export function canDeleteAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.delete");
}

export function resolveAlimentacionScope(user: AuthUser): AlimentacionScope | null {
  if (!canAccessAlimentacion(user)) {
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

export function resolveAlimentacionTenantForCreate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (!canManageAlimentacion(user)) {
    return null;
  }

  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
