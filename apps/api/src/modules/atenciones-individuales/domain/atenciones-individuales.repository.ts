import {
  type AtencionIndividualAdultoRecord,
  type AtencionIndividualHistoryItemRecord,
  type AtencionIndividualRecord,
  type CreateAtencionIndividualRecordCommand,
  type FindAtencionIndividualAdultoByIdQuery,
  type FindAtencionIndividualByConsecutiveQuery,
  type FindAtencionIndividualHistoryByAdultoMayorQuery,
  type FindAtencionIndividualByIdQuery,
  type SavedAtencionIndividualRecord,
  type UpdateAtencionIndividualRecordCommand,
} from "./atencion-individual.types";

export const ATENCIONES_INDIVIDUALES_REPOSITORY = Symbol("ATENCIONES_INDIVIDUALES_REPOSITORY");

export type AtencionesIndividualesRepository = {
  findAdultoMayorById(
    query: FindAtencionIndividualAdultoByIdQuery,
  ): Promise<AtencionIndividualAdultoRecord | null>;
  findHistoryByAdultoMayor(
    query: FindAtencionIndividualHistoryByAdultoMayorQuery,
  ): Promise<AtencionIndividualHistoryItemRecord[]>;
  findById(query: FindAtencionIndividualByIdQuery): Promise<AtencionIndividualRecord | null>;
  findByConsecutive(
    query: FindAtencionIndividualByConsecutiveQuery,
  ): Promise<AtencionIndividualRecord | null>;
  peekNextConsecutive(tenantId: string): Promise<number>;
  create(command: CreateAtencionIndividualRecordCommand): Promise<AtencionIndividualRecord>;
  update(command: UpdateAtencionIndividualRecordCommand): Promise<SavedAtencionIndividualRecord>;
  recordSupportFileDownload(command: {
    atencionId: string;
    tenantId: string;
    fileId: string;
    actorUserId: string;
  }): Promise<void>;
};
