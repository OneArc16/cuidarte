import { type AuthUser, type UserRole } from "@cuidarte/contracts";

import { type EmpleadosScope } from "./empleado.types";

const MANAGER_ROLES: readonly UserRole[] = ["super_admin", "admin"];

export function canManageEmpleados(user: AuthUser): boolean {
  return MANAGER_ROLES.includes(user.role);
}

export function resolveEmpleadosScope(user: AuthUser): EmpleadosScope | null {
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.role === "admin" && user.tenantId !== null) {
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

  return actor.role === "admin" && role !== "super_admin";
}

export function resolveEmpleadoTenantForCreate(
  actor: AuthUser,
  role: UserRole,
  requestedTenantId: string | null,
): string | null {
  if (actor.role === "super_admin") {
    return role === "super_admin" ? null : requestedTenantId;
  }

  if (actor.role === "admin") {
    return actor.tenantId;
  }

  return null;
}
