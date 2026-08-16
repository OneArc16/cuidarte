import { type UserRole, userRoleValues } from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

const ROLE_LABELS = {
  super_admin: "SuperAdmin",
  admin: "Admin",
  auditor: "Auditor",
  director: "Director",
  enfermeria: "Enfermeria",
  fisioterapeuta: "Fisioterapeuta",
  medico: "Medico",
  nutricionista: "Nutricionista",
  psicologo: "Psicologo",
  recreacionista: "Recreacionista",
  trabajadora_social: "Trabajadora Social",
} satisfies Record<UserRole, string>;

export function formatEmpleadoRole(role: UserRole): string {
  return ROLE_LABELS[role];
}

export function getAssignableEmpleadoRoles(currentUserRole: UserRole): UserRole[] {
  const roles = [...userRoleValues];

  if (currentUserRole === "super_admin") {
    return roles;
  }

  if (currentUserRole === "director") {
    return roles.filter((role) => role !== "super_admin" && role !== "admin");
  }

  return roles.filter((role) => role !== "super_admin");
}

export function formatEmpleadoDocument(documentNumber: string | null): string {
  return documentNumber ?? "Sin documento";
}

export function formatEmpleadoPhone(phone: string | null): string {
  return phone ?? "Sin telefono";
}

export function formatEmpleadoStatus(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}

export function resolveEmpleadosApiError(error: unknown): string | null {
  if (error === null) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return "No fue posible completar la solicitud.";
  }

  return null;
}
