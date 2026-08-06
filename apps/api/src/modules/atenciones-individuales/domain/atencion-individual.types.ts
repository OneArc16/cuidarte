import {
  type AtencionDiagnostico,
  type AtencionIndividualCausaExterna,
  type AtencionIndividualFinalidad,
  type AtencionIndividualModalidad,
  type AtencionIndividualSupportFile,
  type AtencionIndividualTipoConsulta,
  type AtencionOrdenMedica,
  type UserRole,
} from "@cuidarte/contracts";

export type AtencionIndividualScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type AtencionIndividualAdultoRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentNumber: string;
  fullName: string;
  birthDate: string;
  sex: string;
  eps: string | null;
  healthRegime: string | null;
};

export type AtencionIndividualRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  attentionDate: string;
  modalidad: AtencionIndividualModalidad;
  tipoConsulta: AtencionIndividualTipoConsulta;
  nombreConsulta: string;
  consecutive: number;
  finalidad: AtencionIndividualFinalidad;
  causaExterna: AtencionIndividualCausaExterna;
  motivoConsulta: string;
  enfermedadActual: string;
  antecedentesPersonales: string | null;
  antecedentesFamiliares: string | null;
  tensionSistolica: number | null;
  tensionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  saturacionOxigeno: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  perimetroAbdominalCm: number | null;
  examenFisico: string | null;
  resultadosLaboratorios: string | null;
  resultadosProcedimientos: string | null;
  ordenesMedicas: AtencionOrdenMedica[];
  diagnosticos: AtencionDiagnostico[];
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  adultoMayor: AtencionIndividualAdultoRecord;
  supportFiles: AtencionIndividualSupportFileRecord[];
};

export type AtencionIndividualSupportFileRecord = {
  id: string;
  atencionId: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string | null;
  relativePath: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AtencionIndividualHistoryItemRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  attentionDate: string;
  modalidad: AtencionIndividualModalidad;
  tipoConsulta: AtencionIndividualTipoConsulta;
  nombreConsulta: string;
  consecutive: number;
  createdByUserId: string;
  createdByUserFullName: string;
  createdByUserRole: UserRole;
  createdAt: Date;
  updatedAt: Date;
};

export type FindAtencionIndividualAdultoByIdQuery = {
  adultoMayorId: string;
  scope: AtencionIndividualScope;
};

export type FindAtencionIndividualByIdQuery = {
  id: string;
  scope: AtencionIndividualScope;
};

export type FindAtencionIndividualHistoryByAdultoMayorQuery = {
  adultoMayorId: string;
  scope: AtencionIndividualScope;
  createdByUserId?: string;
};

export type FindAtencionIndividualByConsecutiveQuery = {
  tenantId: string;
  consecutive: number;
  excludeId?: string;
};

export type AtencionIndividualMutableCommand = {
  attentionDate: string;
  modalidad: AtencionIndividualModalidad;
  tipoConsulta: AtencionIndividualTipoConsulta;
  nombreConsulta: string;
  consecutive: number;
  finalidad: AtencionIndividualFinalidad;
  causaExterna: AtencionIndividualCausaExterna;
  motivoConsulta: string;
  enfermedadActual: string;
  antecedentesPersonales: string | null;
  antecedentesFamiliares: string | null;
  tensionSistolica: number | null;
  tensionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  saturacionOxigeno: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  perimetroAbdominalCm: number | null;
  examenFisico: string | null;
  resultadosLaboratorios: string | null;
  resultadosProcedimientos: string | null;
  ordenesMedicas: AtencionOrdenMedica[];
  diagnosticos: AtencionDiagnostico[];
};

export type PersistAtencionIndividualSupportFile = Omit<
  AtencionIndividualSupportFile,
  "id" | "createdAt"
> & {
  storedName: string;
  checksum: string;
  relativePath: string;
};

export type BufferedAtencionIndividualUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type CreateAtencionIndividualRecordCommand = AtencionIndividualMutableCommand & {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  actorUserId: string;
  supportFiles: PersistAtencionIndividualSupportFile[];
};

export type UpdateAtencionIndividualRecordCommand = AtencionIndividualMutableCommand & {
  id: string;
  actorUserId: string;
  removedSupportFileIds: string[];
  supportFiles: PersistAtencionIndividualSupportFile[];
};

export type SavedAtencionIndividualRecord = {
  record: AtencionIndividualRecord;
  removedFiles: AtencionIndividualSupportFileRecord[];
};
