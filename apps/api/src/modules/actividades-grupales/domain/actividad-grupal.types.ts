import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalResponsibleDepartment,
  type ActividadGrupalSupportFileKind,
  type ActividadGrupalType,
  type UserRole,
} from "@cuidarte/contracts";

export type ActividadesGrupalesScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindActividadesGrupalesQuery = {
  search: string | null;
  activityType: ActividadGrupalType | null;
  organizer: ActividadGrupalOrganizer | null;
  activityMonth: string | null;
  tenantId: string | null;
  scope: ActividadesGrupalesScope;
};

export type FindActividadGrupalByIdQuery = {
  activityId: string;
  scope: ActividadesGrupalesScope;
};

export type FindActividadesGrupalesTrashQuery = FindActividadesGrupalesQuery;

export type SearchActividadGrupalIntegrantesOptionsQuery = {
  tenantId: string;
  search: string | null;
};

export type ActividadGrupalTenantOptionRecord = {
  id: string;
  name: string;
};

export type ActividadGrupalEmpleadoOptionRecord = {
  id: string;
  fullName: string;
  role: UserRole;
};

export type ActividadGrupalIntegranteOptionRecord = {
  id: string;
  documentNumber: string;
  fullName: string;
};

export type ActividadGrupalSupportFileRecord = {
  id: string;
  activityId: string;
  kind: ActividadGrupalSupportFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  createdAt: Date;
};

export type CreateActividadGrupalRecordCommand = {
  tenantId: string;
  actorUserId: string;
  activityName: string;
  activityType: ActividadGrupalType;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  employeeIds: string[];
};

export type UpdateActividadGrupalRecordCommand = {
  activityId: string;
  actorUserId: string;
  activityName: string;
  activityType: ActividadGrupalType;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  employeeIds: string[];
};

export type DeleteActividadGrupalRecordCommand = {
  activityId: string;
  actorUserId: string;
  reason: string;
};

export type RestoreActividadGrupalRecordCommand = {
  activityId: string;
  actorUserId: string;
};

export type CorrectActividadGrupalActaNumberCommand = {
  activityId: string;
  actorUserId: string;
  organizer: ActividadGrupalOrganizer;
  reason: string;
};

export type ActaCorrectionPreviewRow = {
  activityId: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  currentActaNumber: string;
  proposedActaNumber: string;
  sequence: number;
  isDeleted: boolean;
};

export type ActaCorrectionPreview = {
  operationToken: string;
  operationId: string;
  tenantId: string;
  previewExpiresAt: Date;
  totalCount: number;
  changedCount: number;
  unchangedCount: number;
  warningCount: number;
  rows: ActaCorrectionPreviewRow[];
};

export type ApplyActaCorrectionCommand = {
  operationToken: string;
  actorUserId: string;
  reason: string;
};

export type AppliedActaCorrection = {
  operationId: string;
  totalCount: number;
  changedCount: number;
  unchangedCount: number;
};

export class ActaCorrectionConflictError extends Error {
  constructor(message = "La vista previa de correccion ya no esta vigente.") {
    super(message);
    this.name = "ActaCorrectionConflictError";
  }
}

export type PersistActividadGrupalSupportFile = {
  kind: ActividadGrupalSupportFileKind;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
};

export type SaveActividadGrupalDiligenciamientoRecordCommand = {
  activityId: string;
  actorUserId: string;
  objectives: string;
  development: string;
  conclusion: string;
  responsibleDepartment: ActividadGrupalResponsibleDepartment;
  integranteIds: string[];
  removedPhotoFileIds: string[];
  removePdfFile: boolean;
  newFiles: PersistActividadGrupalSupportFile[];
};

export type SavedActividadGrupalDiligenciamientoRecord = {
  detail: ActividadGrupalDiligenciamientoDetailRecord;
  removedFiles: ActividadGrupalSupportFileRecord[];
};

export type ActividadGrupalRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  createdByUserId: string;
  actaNumber: string;
  actaOrganizer: ActividadGrupalOrganizer;
  actaSequence: number;
  previousActaNumber: string | null;
  activityName: string;
  activityType: ActividadGrupalType;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  involvedEmployeesCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ActividadGrupalTrashRecord = ActividadGrupalRecord & {
  deletedAt: Date;
  deletedByUserId: string;
  deletedByUserFullName: string;
  deletionReason: string | null;
};

export type ActividadGrupalDiligenciamientoDetailRecord = {
  activity: ActividadGrupalRecord;
  assignedProfessionals: ActividadGrupalEmpleadoOptionRecord[];
  objectives: string;
  development: string;
  conclusion: string;
  responsibleDepartment: ActividadGrupalResponsibleDepartment | null;
  integrantes: ActividadGrupalIntegranteOptionRecord[];
  photoFiles: ActividadGrupalSupportFileRecord[];
  pdfFile: ActividadGrupalSupportFileRecord | null;
  diligenciamientoCreatedAt: Date | null;
  diligenciamientoUpdatedAt: Date | null;
};

export type ActividadGrupalReportCandidateRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  actaNumber: string;
  activityName: string;
  activityDate: string;
};

export type BufferedActividadGrupalUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};
