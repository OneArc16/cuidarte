import {
  type AdultoMayorStatus,
  type AlimentacionOrganizer,
  type AlimentacionStatus,
  type UserRole,
} from "@cuidarte/contracts";

export type AlimentacionScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindAlimentacionRecordsQuery = {
  search: string | null;
  deliveryMonth: string | null;
  tenantId: string | null;
  scope: AlimentacionScope;
};

export type FindAlimentacionRecordByIdQuery = {
  id: string;
  scope: AlimentacionScope;
};

export type SearchAlimentacionAdultosMayoresOptionsQuery = {
  tenantId: string;
  deliveryDate: string;
  search: string | null;
  limit: "suggestions" | "all";
};

export type FindAlimentacionAdultoMayorByIdQuery = {
  adultoMayorId: string;
  scope: AlimentacionScope;
};

export type FindAlimentacionFormatoEntregaByAdultoAndMonthQuery = {
  adultoMayorId: string;
  deliveryMonth: string;
  scope: AlimentacionScope;
};

export type FindLatestAlimentacionFormatoEmissionQuery = {
  adultoMayorId: string;
  deliveryMonth: string;
  scope: AlimentacionScope;
};

export type FindAlimentacionImportedFormatoVersionsQuery = {
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
};

export type FindAlimentacionImportedFormatoVersionByIdQuery = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
};

export type FindAlimentacionExistingRecordsByAdultosAndDateQuery = {
  tenantId: string;
  deliveryDate: string;
  adultoMayorIds: string[];
};

export type FindAlimentacionRecordByAdultoMayorAndDateQuery = {
  tenantId: string;
  adultoMayorId: string;
  deliveryDate: string;
  excludeId?: string;
};

export type AlimentacionTenantOptionRecord = {
  id: string;
  name: string;
};

export type AlimentacionAdultoOptionRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantDepartment: string | null;
  documentNumber: string;
  fullName: string;
  status?: AdultoMayorStatus;
  deathDate?: string | null;
};

export type AlimentacionRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  documentNumber: string;
  fullName: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
  createdAt: Date;
  updatedAt: Date;
  importedFormato: AlimentacionImportedFormatoVersionRecord | null;
};

export type AlimentacionImportedFormatoVersionRecord = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  version: number;
  source: "importado";
  originalName: string;
  storedName: string;
  pdfRelativePath: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  importedByUserId: string;
  importedByUserFullName: string;
  importedAt: Date;
};

export type BufferedAlimentacionFormatoPdfUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type AlimentacionFormatoEntregaRecord = {
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantDepartment: string | null;
  adultoMayorId: string;
  documentNumber: string;
  fullName: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
  updatedAt: Date;
};

export type AlimentacionFormatoEmissionRecord = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  version: number;
  signerEmployeeIdSnapshot: string;
  signerNameSnapshot: string;
  signerRoleSnapshot: UserRole;
  signatureVersionIdSnapshot: string;
  tenantLogoVersionIdSnapshot: string | null;
  filename: string;
  pdfRelativePath: string;
  sourceRecordCount: number;
  sourceDateFrom: string | null;
  sourceDateTo: string | null;
  issuedByUserId: string;
  issuedAt: Date;
};

export type AlimentacionFormatoReportCandidateRecord = {
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  documentNumber: string;
  names: string;
  surnames: string;
  deliveryMonth: string;
  importedVersion: AlimentacionImportedFormatoVersionRecord | null;
};

export type CreateAlimentacionFormatoEntregaExportAuditCommand = {
  actorUserId: string;
  targetTenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
};

export type CreateAlimentacionImportedFormatoDownloadAuditCommand = {
  actorUserId: string;
  targetTenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  versionId: string;
  version: number;
};

export type CreateAlimentacionFormatoEmissionCommand = {
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  signerEmployeeIdSnapshot: string;
  signerNameSnapshot: string;
  signerRoleSnapshot: UserRole;
  signatureVersionIdSnapshot: string;
  tenantLogoVersionIdSnapshot: string;
  filename: string;
  pdfRelativePath: string;
  sourceRecordCount: number;
  sourceDateFrom: string | null;
  sourceDateTo: string | null;
  issuedByUserId: string;
  issuedAt: Date;
};

export type CreateAlimentacionImportedFormatoVersionCommand = {
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  originalName: string;
  storedName: string;
  pdfRelativePath: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  importedByUserId: string;
  importedAt: Date;
};

export type CreateAlimentacionBatchRecordCommand = {
  tenantId: string;
  actorUserId: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  registros: Array<{
    adultoMayorId: string;
    refrigerio1: AlimentacionStatus;
    almuerzo: AlimentacionStatus;
    refrigerio2: AlimentacionStatus;
    auxilioTransporte: AlimentacionStatus;
  }>;
};

export type UpdateAlimentacionRecordCommand = {
  id: string;
  actorUserId: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
};

export type DeleteAlimentacionRecordCommand = {
  id: string;
  actorUserId: string;
  scope: AlimentacionScope;
};
