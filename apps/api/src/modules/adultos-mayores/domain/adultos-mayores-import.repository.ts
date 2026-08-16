import {
  type AdultoMayorImportBatchCreateCommand,
  type AdultoMayorImportCommitResult,
  type AdultoMayorImportBatchDetailRowRecord,
  type AdultoMayorImportBatchRecord,
  type AdultoMayorImportBatchRowCreateCommand,
  type AdultoMayorImportCatalogMaps,
  type AdultoMayorImportExistingRecord,
  type AdultoMayorImportParsedWorkbook,
} from "./adulto-mayor-import.types";

export const ADULTOS_MAYORES_IMPORT_REPOSITORY = Symbol("ADULTOS_MAYORES_IMPORT_REPOSITORY");

export class AdultoMayorImportCommitConflictError extends Error {
  constructor(message = "El lote cambio desde la validacion y debe volver a revisarse.") {
    super(message);
    this.name = "AdultoMayorImportCommitConflictError";
  }
}

export type AdultosMayoresImportRepository = {
  loadCatalogMaps(): Promise<AdultoMayorImportCatalogMaps>;
  findTenantById(tenantId: string): Promise<{ id: string; name: string; isActive: boolean } | null>;
  findActiveTenantOptions(): Promise<Array<{ id: string; name: string }>>;
  findExistingAdultsByTenantAndDocuments(params: {
    tenantId: string;
    documents: Array<{ documentType: string; documentNumber: string }>;
  }): Promise<AdultoMayorImportExistingRecord[]>;
  createValidatedBatch(params: {
    batch: AdultoMayorImportBatchCreateCommand;
    rows: AdultoMayorImportBatchRowCreateCommand[];
  }): Promise<AdultoMayorImportBatchRecord>;
  findImportBatchById(params: {
    importId: string;
    tenantId?: string;
    requestedByUserId?: string;
  }): Promise<AdultoMayorImportBatchRecord | null>;
  findImportBatchRows(importId: string): Promise<AdultoMayorImportBatchDetailRowRecord[]>;
  lockBatchForConfirmation(params: {
    importId: string;
    requestedByUserId: string;
  }): Promise<AdultoMayorImportBatchRecord | null>;
  markImportAsCompleted(params: {
    importId: string;
    createdRows: number;
    updatedRows: number;
    unchangedRows: number;
    existingRows: number;
    confirmedAt: Date;
  }): Promise<void>;
  markImportAsFailed(params: { importId: string; failureCode: string }): Promise<void>;
  commitValidatedBatch(params: { importId: string; actorUserId: string }): Promise<AdultoMayorImportCommitResult>;
  attachCreatedAdults(params: {
    importId: string;
    createdAdults: Array<{ documentType: string; documentNumber: string; adultoId: string }>;
  }): Promise<void>;
  attachExistingAdults(params: {
    importId: string;
    existingAdults: Array<{ documentType: string; documentNumber: string; adultoId: string }>;
  }): Promise<void>;
  recordAudit(params: {
    actorUserId: string;
    action: string;
    targetTenantId: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
  insertAdultosMayores(params: {
    tenantId: string;
    requestedByUserId: string;
    rows: Array<{
      documentType: string;
      documentNumber: string;
      normalizedPayload: Record<string, unknown>;
    }>;
  }): Promise<Array<{ id: string; documentType: string; documentNumber: string }>>;
  listImportBatchIdsByChecksum(checksum: string): Promise<string[]>;
};
