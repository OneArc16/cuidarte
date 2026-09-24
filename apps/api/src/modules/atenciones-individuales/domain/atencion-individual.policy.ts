import {
  hasUserPermission,
  type AtencionIndividualHistoryAccess,
  atencionIndividualHistoryEditorRoleValues,
  atencionIndividualHistoryReaderRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

import { type AtencionIndividualScope } from "./atencion-individual.types";

const CLINICAL_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionIndividualHistoryEditorRoleValues,
);
const CLINICAL_READER_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionIndividualHistoryReaderRoleValues,
);

type AtencionOwnership = {
  createdByUserId: string;
  createdByUserRole: AuthUser["role"];
};

export function resolveAtencionIndividualScope(user: AuthUser): AtencionIndividualScope | null {
  if (user.permissions !== undefined && !hasUserPermission(user, "atenciones_individuales.view")) {
    return null;
  }

  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return { type: "tenant", tenantId: user.tenantId };
}

export function canEditAtencionIndividual(user: AuthUser): boolean {
  return user.permissions === undefined
    ? user.role !== "enfermeria" && CLINICAL_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_individuales.edit");
}

export function canCreateAtencionIndividual(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role !== "enfermeria" && CLINICAL_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_individuales.create");
}

export function canAccessAtencionIndividualHistory(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? CLINICAL_EDITOR_ROLES.has(user.role) || CLINICAL_READER_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_individuales.view");
}

export function resolveAtencionIndividualHistoryAccess(
  user: Pick<AuthUser, "id" | "role" | "permissions">,
  atencion: AtencionOwnership,
): AtencionIndividualHistoryAccess | null {
  if (
    user.permissions !== undefined &&
    hasUserPermission(user, "atenciones_individuales.edit") &&
    atencion.createdByUserId === user.id
  ) {
    return "edit";
  }

  if (
    user.permissions !== undefined &&
    hasUserPermission(user, "atenciones_individuales.edit") &&
    atencion.createdByUserId === user.id
  ) {
    return "edit";
  }

  if (user.permissions !== undefined && hasUserPermission(user, "atenciones_individuales.view")) {
    return "view";
  }

  if (
    user.permissions === undefined &&
    hasUserPermission(user, "atenciones_individuales.view") &&
    CLINICAL_READER_ROLES.has(user.role)
  ) {
    return "view";
  }

  if (
    hasUserPermission(user, "atenciones_individuales.view") &&
    user.role === "enfermeria" &&
    atencion.createdByUserRole === "medico"
  ) {
    return "view";
  }

  if (
    hasUserPermission(user, "atenciones_individuales.view") &&
    user.role === "medico" &&
    atencion.createdByUserRole === "enfermeria"
  ) {
    return "view";
  }

  if (
    hasUserPermission(user, "atenciones_individuales.view") &&
    atencion.createdByUserRole === "enfermeria"
  ) {
    return "view";
  }

  if (
    hasUserPermission(user, "atenciones_individuales.edit") &&
    user.role !== "enfermeria" &&
    CLINICAL_EDITOR_ROLES.has(user.role) &&
    atencion.createdByUserId === user.id
  ) {
    return "edit";
  }

  return null;
}

export function canViewAtencionIndividual(
  user: Pick<AuthUser, "id" | "role" | "permissions">,
  atencion: AtencionOwnership,
): boolean {
  return resolveAtencionIndividualHistoryAccess(user, atencion) !== null;
}

export function canEditOwnedAtencionIndividual(
  user: Pick<AuthUser, "id" | "role" | "permissions">,
  atencion: AtencionOwnership,
): boolean {
  return resolveAtencionIndividualHistoryAccess(user, atencion) === "edit";
}
