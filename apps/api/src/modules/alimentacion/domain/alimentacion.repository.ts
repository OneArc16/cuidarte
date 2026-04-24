import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionRecord,
  type AlimentacionTenantOptionRecord,
  type CreateAlimentacionBatchRecordCommand,
  type FindAlimentacionAdultoMayorByIdQuery,
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
  findExistingByAdultosAndDate(
    query: FindAlimentacionExistingRecordsByAdultosAndDateQuery,
  ): Promise<AlimentacionRecord[]>;
  findByAdultoMayorAndDate(
    query: FindAlimentacionRecordByAdultoMayorAndDateQuery,
  ): Promise<AlimentacionRecord | null>;
  createMany(command: CreateAlimentacionBatchRecordCommand): Promise<number>;
  update(command: UpdateAlimentacionRecordCommand): Promise<AlimentacionRecord>;
};
