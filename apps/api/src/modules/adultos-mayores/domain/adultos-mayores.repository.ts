import {
  type AdultoMayorAuditCommand,
  type AdultoMayorRecord,
  type AdultoMayorTenantOptionRecord,
  type CreateAdultoMayorRecordCommand,
  type FindAdultoMayorByDocumentQuery,
  type FindAdultoMayorByIdQuery,
  type FindAdultosMayoresQuery,
  type FindAdultosMayoresTrashQuery,
  type AdultoMayorTrashRecord,
  type SendAdultoMayorToTrashCommand,
  type RestoreAdultoMayorCommand,
  type UpdateAdultoMayorRecordCommand,
  type AdultoMayorDocumentRecord,
} from "./adulto-mayor.types";

export const ADULTOS_MAYORES_REPOSITORY = Symbol("ADULTOS_MAYORES_REPOSITORY");

export type AdultosMayoresRepository = {
  findMany(query: FindAdultosMayoresQuery): Promise<AdultoMayorRecord[]>;
  findTrashMany(query: FindAdultosMayoresTrashQuery): Promise<AdultoMayorTrashRecord[]>;
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
  sendToTrash(command: SendAdultoMayorToTrashCommand): Promise<boolean>;
  restore(command: RestoreAdultoMayorCommand): Promise<boolean>;
  findDocumentByAdultoId(adultoMayorId: string): Promise<AdultoMayorDocumentRecord | null>;
  saveDocument(document: AdultoMayorDocumentRecord): Promise<AdultoMayorDocumentRecord>;
  deleteDocument(adultoMayorId: string): Promise<AdultoMayorDocumentRecord | null>;
};
