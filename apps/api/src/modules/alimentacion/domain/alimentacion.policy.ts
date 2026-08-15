import {
  alimentacionAccessRoleValues,
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

export function canAccessAlimentacion(user: Pick<AuthUser, "role">): boolean {
  return ALIMENTACION_ACCESS_ROLES.has(user.role);
}

export function canManageAlimentacion(user: Pick<AuthUser, "role">): boolean {
  return ALIMENTACION_EDITOR_ROLES.has(user.role);
}

export function canDeleteAlimentacion(user: Pick<AuthUser, "role">): boolean {
  return ALIMENTACION_EDITOR_ROLES.has(user.role);
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
