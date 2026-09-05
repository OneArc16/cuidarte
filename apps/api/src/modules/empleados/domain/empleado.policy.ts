import { type AuthUser, type UserRole } from "@cuidarte/contracts";

import { type EmpleadosScope } from "./empleado.types";

const CREATOR_ROLES: readonly UserRole[] = ["super_admin", "admin", "director"];
const MANAGER_ROLES: readonly UserRole[] = ["super_admin", "admin", "director"];

export function canCreateEmpleados(user: AuthUser): boolean {
  return CREATOR_ROLES.includes(user.role);
}

export function canManageEmpleados(user: AuthUser): boolean {
  return MANAGER_ROLES.includes(user.role);
}

export function resolveEmpleadosScope(user: AuthUser): EmpleadosScope | null {
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (
    (user.role === "admin" || user.role === "auditor" || user.role === "director") &&
    user.tenantId !== null
  ) {
    return {
      type: "tenant",
      tenantId: user.tenantId,
    };
  }

  return null;
}

export function canAssignEmpleadoRole(actor: AuthUser, role: UserRole): boolean {
  if (actor.role === "super_admin") {
    return true;
  }

  if (actor.role === "admin") {
    return role !== "super_admin";
  }

  if (actor.role === "director") {
    return role !== "super_admin" && role !== "admin";
  }

  return false;
}

export function resolveEmpleadoTenantForCreate(
  actor: AuthUser,
  role: UserRole,
  requestedTenantId: string | null,
): string | null {
  if (actor.role === "super_admin") {
    return role === "super_admin" ? null : requestedTenantId;
  }

  if (actor.role === "admin" || actor.role === "director") {
    return actor.tenantId;
  }

  return null;
}
