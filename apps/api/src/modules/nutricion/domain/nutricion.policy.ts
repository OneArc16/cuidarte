import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

import { type NutricionScope } from "./nutricion.types";

type NutricionOwnership = { tenantId: string; createdByUserId: string };

const MODULE_ROLES = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "auditor",
  "director",
  "nutricionista",
]);
const CREATOR_ROLES = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "director",
  "nutricionista",
]);
const MANAGER_ROLES = new Set<AuthUser["role"]>(["super_admin", "admin", "director"]);

export function resolveNutricionScope(user: AuthUser): NutricionScope | null {
  if (user.permissions !== undefined && !hasUserPermission(user, "nutricion.view")) {
    return null;
  }

  if (user.role === "super_admin") {
    return { type: "all" };
  }

  return user.tenantId === null ? null : { type: "tenant", tenantId: user.tenantId };
}

export function canOpenNutricion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? MODULE_ROLES.has(user.role)
    : hasUserPermission(user, "nutricion.view");
}

export function canCreateNutricion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? CREATOR_ROLES.has(user.role)
    : hasUserPermission(user, "nutricion.create");
}

export function canManageNutricion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? MANAGER_ROLES.has(user.role)
    : hasUserPermission(user, "nutricion.manage");
}

export function canEditNutricionRecord(
  user: Pick<AuthUser, "id" | "role" | "tenantId" | "permissions">,
  record: NutricionOwnership,
): boolean {
  if (
    user.role !== "super_admin" &&
    (user.tenantId === null || user.tenantId !== record.tenantId)
  ) {
    return false;
  }

  if (canManageNutricion(user)) {
    return true;
  }

  return (
    record.createdByUserId === user.id &&
    (user.permissions === undefined
      ? user.role === "nutricionista"
      : hasUserPermission(user, "nutricion.edit_own"))
  );
}
