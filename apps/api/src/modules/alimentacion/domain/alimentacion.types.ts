import {
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

export type CreateAlimentacionFormatoEntregaExportAuditCommand = {
  actorUserId: string;
  targetTenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
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
