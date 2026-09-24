import {
  hasUserPermission,
  type AuthUser,
  type UserPermission,
  type UserRole,
  userPermissionValues,
} from "@cuidarte/contracts";

import { type EmpleadosScope } from "./empleado.types";

const CREATOR_ROLES: readonly UserRole[] = ["super_admin", "admin", "director"];
const MANAGER_ROLES: readonly UserRole[] = ["super_admin", "admin", "director"];

export function canViewEmpleados(user: AuthUser): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "auditor" ||
        user.role === "director"
    : hasUserPermission(user, "empleados.view");
}

export function defaultEmpleadoPermissions(role: UserRole): UserPermission[] {
  const all = [...userPermissionValues];
  const defaults: Partial<Record<UserRole, readonly UserPermission[]>> = {
    super_admin: all,
    admin: all,
    auditor: [
      "dashboard.view",
      "empleados.view",
      "actividades_grupales.view",
      "adultos_mayores.view",
      "alimentacion.view",
      "atenciones_individuales.view",
      "atenciones_enfermeria.view",
    ],
    director: [
      "dashboard.view",
      "empleados.view",
      "empleados.create",
      "empleados.edit",
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "adultos_mayores.import",
      "alimentacion.view",
      "alimentacion.create",
      "alimentacion.edit",
      "alimentacion.delete",
      "alimentacion.import",
      "alimentacion.export",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
      "atenciones_enfermeria.view",
      "atenciones_enfermeria.create",
      "atenciones_enfermeria.edit",
      "atenciones_enfermeria.delete",
      "reportes.view",
      "reportes.export",
    ],
    enfermeria: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_enfermeria.view",
      "atenciones_enfermeria.create",
      "atenciones_enfermeria.edit",
    ],
    fisioterapeuta: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
    ],
    medico: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
      "atenciones_enfermeria.view",
    ],
    nutricionista: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
    ],
    psicologo: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
    ],
    recreacionista: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
    ],
    trabajadora_social: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
    ],
  };

  return [...(defaults[role] ?? [])];
}

export function canCreateEmpleados(user: AuthUser): boolean {
  return user.permissions === undefined
    ? CREATOR_ROLES.includes(user.role)
    : hasUserPermission(user, "empleados.create");
}

export function canManageEmpleados(user: AuthUser): boolean {
  return user.permissions === undefined
    ? MANAGER_ROLES.includes(user.role)
    : hasUserPermission(user, "empleados.edit");
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
