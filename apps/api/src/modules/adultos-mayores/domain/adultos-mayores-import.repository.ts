import {
  type AdultoMayorImportBatchCreateCommand,
  type AdultoMayorImportCommitResult,
  type AdultoMayorImportExistingAdultRecord,
  type AdultoMayorImportBatchRecord,
  type AdultoMayorImportBatchRowCreateCommand,
  type AdultoMayorImportCatalogMaps,
} from "./adulto-mayor-import.types";

export const ADULTOS_MAYORES_IMPORT_REPOSITORY = Symbol("ADULTOS_MAYORES_IMPORT_REPOSITORY");

export type AdultosMayoresImportRepository = {
  loadCatalogMaps(): Promise<AdultoMayorImportCatalogMaps>;
  findTenantById(tenantId: string): Promise<{ id: string; name: string; isActive: boolean } | null>;
  findActiveTenantOptions(): Promise<Array<{ id: string; name: string }>>;
  findExistingAdultsByTenantAndDocuments(params: {
    tenantId: string;
    documents: Array<{ documentType: string; documentNumber: string }>;
  }): Promise<AdultoMayorImportExistingAdultRecord[]>;
  createValidatedBatch(params: {
    batch: AdultoMayorImportBatchCreateCommand;
    rows: AdultoMayorImportBatchRowCreateCommand[];
  }): Promise<AdultoMayorImportBatchRecord>;
  findImportBatchById(params: {
    importId: string;
    tenantId?: string;
    requestedByUserId?: string;
  }): Promise<AdultoMayorImportBatchRecord | null>;
  commitValidatedBatch(params: {
    importId: string;
    actorUserId: string;
  }): Promise<AdultoMayorImportCommitResult | null>;
  recordAudit(params: {
    actorUserId: string;
    action: string;
    targetTenantId: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void>;
};
