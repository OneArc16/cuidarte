import {
  type AdultoMayorAuditCommand,
  type AdultoMayorRecord,
  type AdultoMayorTenantOptionRecord,
  type CreateAdultoMayorRecordCommand,
  type FindAdultoMayorByDocumentQuery,
  type FindAdultoMayorByIdQuery,
  type FindAdultosMayoresQuery,
  type UpdateAdultoMayorRecordCommand,
} from "./adulto-mayor.types";

export const ADULTOS_MAYORES_REPOSITORY = Symbol("ADULTOS_MAYORES_REPOSITORY");

export type AdultosMayoresRepository = {
  findMany(query: FindAdultosMayoresQuery): Promise<AdultoMayorRecord[]>;
  findById(query: FindAdultoMayorByIdQuery): Promise<AdultoMayorRecord | null>;
  findByDocument(query: FindAdultoMayorByDocumentQuery): Promise<AdultoMayorRecord | null>;
  findTenantOptions(): Promise<AdultoMayorTenantOptionRecord[]>;
  create(
    command: CreateAdultoMayorRecordCommand,
    audit: AdultoMayorAuditCommand,
  ): Promise<AdultoMayorRecord>;
  update(
    command: UpdateAdultoMayorRecordCommand,
    audit: AdultoMayorAuditCommand,
  ): Promise<AdultoMayorRecord>;
};
