import {
  hasUserPermission,
  type AtencionIndividualHistoryAccess,
  atencionIndividualHistoryEditorRoleValues,
  atencionIndividualHistoryReaderRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

const CLINICAL_HISTORY_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionIndividualHistoryEditorRoleValues,
);
const CLINICAL_HISTORY_READER_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionIndividualHistoryReaderRoleValues,
);

type HistoriaClinicaActor = Pick<AuthUser, "id" | "role" | "permissions">;

type HistoriaClinicaRecordOwner = {
  createdByUserId: string;
  createdByUserRole?: AuthUser["role"];
};

export function canOpenHistoriaClinica(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? CLINICAL_HISTORY_EDITOR_ROLES.has(user.role) || CLINICAL_HISTORY_READER_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_individuales.view");
}

export function canCreateAtencionIndividual(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role !== "enfermeria" && CLINICAL_HISTORY_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_individuales.create");
}

export function resolveHistoriaClinicaAction(
  user: HistoriaClinicaActor,
  record: HistoriaClinicaRecordOwner,
): AtencionIndividualHistoryAccess | null {
  if (user.permissions !== undefined) {
    if (
      hasUserPermission(user, "atenciones_individuales.edit") &&
      record.createdByUserId === user.id
    ) {
      return "edit";
    }

    return hasUserPermission(user, "atenciones_individuales.view") ? "view" : null;
  }

  if (CLINICAL_HISTORY_READER_ROLES.has(user.role)) {
    return "view";
  }

  if (record.createdByUserRole === "enfermeria") {
    return "view";
  }

  if (CLINICAL_HISTORY_EDITOR_ROLES.has(user.role) && record.createdByUserId === user.id) {
    return "edit";
  }

  return null;
}

export function canSeeAtencionInHistoriaClinica(
  user: HistoriaClinicaActor,
  record: HistoriaClinicaRecordOwner,
): boolean {
  return resolveHistoriaClinicaAction(user, record) !== null;
}
