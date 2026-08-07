import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionFormatoEmissionRecord,
  type AlimentacionFormatoEntregaRecord,
  type AlimentacionImportedFormatoVersionRecord,
  type AlimentacionRecord,
  type AlimentacionTenantOptionRecord,
  type CreateAlimentacionFormatoEmissionCommand,
  type CreateAlimentacionImportedFormatoVersionCommand,
  type CreateAlimentacionFormatoEntregaExportAuditCommand,
  type CreateAlimentacionImportedFormatoDownloadAuditCommand,
  type CreateAlimentacionBatchRecordCommand,
  type FindAlimentacionAdultoMayorByIdQuery,
  type FindLatestAlimentacionFormatoEmissionQuery,
  type FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
  type FindAlimentacionImportedFormatoVersionByIdQuery,
  type FindAlimentacionImportedFormatoVersionsQuery,
  type FindAlimentacionExistingRecordsByAdultosAndDateQuery,
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
  findImportedFormatoVersions(
    query: FindAlimentacionImportedFormatoVersionsQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord[]>;
  findImportedFormatoVersionById(
    query: FindAlimentacionImportedFormatoVersionByIdQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord | null>;
  findExistingByAdultosAndDate(
    query: FindAlimentacionExistingRecordsByAdultosAndDateQuery,
  ): Promise<AlimentacionRecord[]>;
  findByAdultoMayorAndDate(
    query: FindAlimentacionRecordByAdultoMayorAndDateQuery,
  ): Promise<AlimentacionRecord | null>;
  createMany(command: CreateAlimentacionBatchRecordCommand): Promise<number>;
  update(command: UpdateAlimentacionRecordCommand): Promise<AlimentacionRecord>;
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
};
