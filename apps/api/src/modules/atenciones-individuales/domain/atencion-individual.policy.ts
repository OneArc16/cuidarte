import {
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
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return { type: "tenant", tenantId: user.tenantId };
}

export function canEditAtencionIndividual(user: AuthUser): boolean {
  return user.role !== "enfermeria" && CLINICAL_EDITOR_ROLES.has(user.role);
}

export function canCreateAtencionIndividual(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "enfermeria" && CLINICAL_EDITOR_ROLES.has(user.role);
}

export function canAccessAtencionIndividualHistory(user: Pick<AuthUser, "role">): boolean {
  return CLINICAL_EDITOR_ROLES.has(user.role) || CLINICAL_READER_ROLES.has(user.role);
}

export function resolveAtencionIndividualHistoryAccess(
  user: Pick<AuthUser, "id" | "role">,
  atencion: AtencionOwnership,
): AtencionIndividualHistoryAccess | null {
  if (CLINICAL_READER_ROLES.has(user.role)) {
    return "view";
  }

  if (user.role === "enfermeria" && atencion.createdByUserRole === "medico") {
    return "view";
  }

  if (user.role === "medico" && atencion.createdByUserRole === "enfermeria") {
    return "view";
  }

  if (atencion.createdByUserRole === "enfermeria") {
    return "view";
  }

  if (user.role !== "enfermeria" && CLINICAL_EDITOR_ROLES.has(user.role) && atencion.createdByUserId === user.id) {
    return "edit";
  }

  return null;
}

export function canViewAtencionIndividual(
  user: Pick<AuthUser, "id" | "role">,
  atencion: AtencionOwnership,
): boolean {
  return resolveAtencionIndividualHistoryAccess(user, atencion) !== null;
}

export function canEditOwnedAtencionIndividual(
  user: Pick<AuthUser, "id" | "role">,
  atencion: AtencionOwnership,
): boolean {
  return resolveAtencionIndividualHistoryAccess(user, atencion) === "edit";
}
