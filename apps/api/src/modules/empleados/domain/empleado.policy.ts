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
const REPORT_CHART_PERMISSIONS: readonly UserPermission[] = [
  "reportes.chart.monthly_attendances",
  "reportes.chart.activities_by_type",
  "reportes.chart.monthly_deliveries",
  "reportes.chart.sex_distribution",
  "reportes.chart.rations_by_month",
  "reportes.chart.transport_by_month",
];

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
      "atenciones_individuales.medical_history",
      "atenciones_enfermeria.view",
      "atenciones_enfermeria.nursing_history",
      "nutricion.view",
      "psicologia.view",
      "reportes.view",
      ...REPORT_CHART_PERMISSIONS,
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
      "alimentacion.view_delivery_days",
      "alimentacion.create",
      "alimentacion.edit",
      "alimentacion.delete",
      "alimentacion.import",
      "alimentacion.bulk_import",
      "alimentacion.export",
      "atenciones_individuales.view",
      "atenciones_individuales.medical_history",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
      "atenciones_enfermeria.view",
      "atenciones_enfermeria.nursing_history",
      "atenciones_enfermeria.create",
      "atenciones_enfermeria.edit",
      "atenciones_enfermeria.delete",
      "nutricion.view",
      "nutricion.create",
      "nutricion.edit_own",
      "nutricion.manage",
      "psicologia.view",
      "psicologia.create",
      "psicologia.edit_own",
      "psicologia.manage",
      "reportes.view",
      "reportes.export",
      ...REPORT_CHART_PERMISSIONS,
    ],
    enfermeria: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_enfermeria.view",
      "atenciones_enfermeria.nursing_history",
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
      "atenciones_individuales.medical_history",
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
      "atenciones_individuales.medical_history",
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
      "atenciones_individuales.medical_history",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
      "nutricion.view",
      "nutricion.create",
      "nutricion.edit_own",
    ],
    psicologo: [
      "actividades_grupales.view",
      "actividades_grupales.create",
      "actividades_grupales.edit",
      "adultos_mayores.view",
      "adultos_mayores.create",
      "adultos_mayores.edit",
      "atenciones_individuales.view",
      "atenciones_individuales.medical_history",
      "atenciones_individuales.create",
      "atenciones_individuales.edit",
      "psicologia.view",
      "psicologia.create",
      "psicologia.edit_own",
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
      "atenciones_individuales.medical_history",
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
