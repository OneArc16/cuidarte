import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionFormatoEmissionRecord,
  type AlimentacionFormatoEntregaRecord,
  type AlimentacionFormatoReportCandidateRecord,
  type AlimentacionImportedFormatoVersionRecord,
  type AlimentacionBulkImportBatchRecord,
  type AlimentacionBulkImportItemRecord,
  type AlimentacionRecord,
  type AlimentacionTenantOptionRecord,
  type CreateAlimentacionFormatoEmissionCommand,
  type CreateAlimentacionImportedFormatoVersionCommand,
  type CreateAlimentacionBulkImportBatchCommand,
  type CreateAlimentacionBulkImportItemCommand,
  type CreateAlimentacionFormatoEntregaExportAuditCommand,
  type CreateAlimentacionImportedFormatoDownloadAuditCommand,
  type CreateAlimentacionBatchRecordCommand,
  type DeleteAlimentacionRecordCommand,
  type FindAlimentacionAdultoMayorByIdQuery,
  type FindLatestAlimentacionFormatoEmissionQuery,
  type FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
  type FindAlimentacionImportedFormatoVersionByIdQuery,
  type FindAlimentacionImportedFormatoVersionsQuery,
  type FindAlimentacionExistingRecordsByAdultosAndDatesQuery,
  type FindAlimentacionRecordByAdultoMayorAndDateQuery,
  type FindAlimentacionRecordByIdQuery,
  type FindAlimentacionRecordsQuery,
  type SearchAlimentacionAdultosMayoresOptionsQuery,
  type UpdateAlimentacionRecordCommand,
} from "./alimentacion.types";

export const ALIMENTACION_REPOSITORY = Symbol("ALIMENTACION_REPOSITORY");

export type AlimentacionRepository = {
  findMany(query: FindAlimentacionRecordsQuery): Promise<AlimentacionRecord[]>;
  findById(query: FindAlimentacionRecordByIdQuery): Promise<AlimentacionRecord | null>;
  findTenantOptions(): Promise<AlimentacionTenantOptionRecord[]>;
  searchAdultosMayoresOptions(
    query: SearchAlimentacionAdultosMayoresOptionsQuery,
  ): Promise<AlimentacionAdultoOptionRecord[]>;
  findAdultosMayoresByIds(
    tenantId: string,
    adultoMayorIds: string[],
  ): Promise<AlimentacionAdultoOptionRecord[]>;
  findAdultoMayorById(
    query: FindAlimentacionAdultoMayorByIdQuery,
  ): Promise<AlimentacionAdultoOptionRecord | null>;
  findFormatoEntregaByAdultoAndMonth(
    query: FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
  ): Promise<AlimentacionFormatoEntregaRecord[]>;
  findLatestFormatoEntregaEmission(
    query: FindLatestAlimentacionFormatoEmissionQuery,
  ): Promise<AlimentacionFormatoEmissionRecord | null>;
  findFormatoEntregaReportCandidates?(query: {
    tenantId: string;
    deliveryMonth: string;
  }): Promise<AlimentacionFormatoReportCandidateRecord[]>;
  findImportedFormatoVersions(
    query: FindAlimentacionImportedFormatoVersionsQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord[]>;
  findImportedFormatoVersionById(
    query: FindAlimentacionImportedFormatoVersionByIdQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord | null>;
  findExistingByAdultosAndDates(
    query: FindAlimentacionExistingRecordsByAdultosAndDatesQuery,
  ): Promise<AlimentacionRecord[]>;
  findByAdultoMayorAndDate(
    query: FindAlimentacionRecordByAdultoMayorAndDateQuery,
  ): Promise<AlimentacionRecord | null>;
  createMany(command: CreateAlimentacionBatchRecordCommand): Promise<number>;
  update(command: UpdateAlimentacionRecordCommand): Promise<AlimentacionRecord>;
  delete(command: DeleteAlimentacionRecordCommand): Promise<AlimentacionRecord | null>;
  createFormatoEntregaExportAudit(
    command: CreateAlimentacionFormatoEntregaExportAuditCommand,
  ): Promise<void>;
  createImportedFormatoDownloadAudit(
    command: CreateAlimentacionImportedFormatoDownloadAuditCommand,
  ): Promise<void>;
  createFormatoEntregaEmission(
    command: CreateAlimentacionFormatoEmissionCommand,
  ): Promise<AlimentacionFormatoEmissionRecord>;
  createImportedFormatoVersion(
    command: CreateAlimentacionImportedFormatoVersionCommand,
  ): Promise<AlimentacionImportedFormatoVersionRecord>;
  createBulkImportBatch?(
    command: CreateAlimentacionBulkImportBatchCommand,
  ): Promise<AlimentacionBulkImportBatchRecord>;
  createBulkImportItems?(
    commands: CreateAlimentacionBulkImportItemCommand[],
  ): Promise<AlimentacionBulkImportItemRecord[]>;
  findBulkImportBatch?(id: string): Promise<AlimentacionBulkImportBatchRecord | null>;
  findBulkImportItems?(batchId: string): Promise<AlimentacionBulkImportItemRecord[]>;
  updateBulkImportItem?(
    id: string,
    patch: Partial<
      Pick<
        AlimentacionBulkImportItemRecord,
        "status" | "reasonCode" | "reasonMessage" | "importedVersionId" | "importedVersion"
      >
    >,
  ): Promise<AlimentacionBulkImportItemRecord>;
  findAdultosByNormalizedDocumentNumbers?(
    tenantId: string,
    normalizedDocumentNumbers: string[],
  ): Promise<AlimentacionAdultoOptionRecord[]>;
};
