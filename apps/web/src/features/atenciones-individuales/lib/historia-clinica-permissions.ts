import {
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

type HistoriaClinicaActor = Pick<AuthUser, "id" | "role">;

type HistoriaClinicaRecordOwner = {
  createdByUserId: string;
};

export function canOpenHistoriaClinica(user: Pick<AuthUser, "role">): boolean {
  return (
    CLINICAL_HISTORY_EDITOR_ROLES.has(user.role) || CLINICAL_HISTORY_READER_ROLES.has(user.role)
  );
}

export function canCreateAtencionIndividual(user: Pick<AuthUser, "role">): boolean {
  return CLINICAL_HISTORY_EDITOR_ROLES.has(user.role);
}

export function resolveHistoriaClinicaAction(
  user: HistoriaClinicaActor,
  record: HistoriaClinicaRecordOwner,
): AtencionIndividualHistoryAccess | null {
  if (CLINICAL_HISTORY_READER_ROLES.has(user.role)) {
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
