import {
  type AtencionEnfermeriaAdultoRecord,
  type AtencionEnfermeriaDetailRecord,
  type AtencionEnfermeriaHistoryItemRecord,
  type AtencionEnfermeriaListItemRecord,
  type AtencionEnfermeriaScope,
  type CreateAtencionEnfermeriaRecordCommand,
  type FindAtencionEnfermeriaByIdQuery,
  type FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
  type FindAtencionEnfermeriaListQuery,
  type UpdateAtencionEnfermeriaRecordCommand,
} from "./atencion-enfermeria.types";

export const ATENCIONES_ENFERMERIA_REPOSITORY = Symbol("ATENCIONES_ENFERMERIA_REPOSITORY");

export class AtencionEnfermeriaNotFoundError extends Error {
  constructor(message = "La atencion de enfermeria no fue encontrada.") {
    super(message);
    this.name = "AtencionEnfermeriaNotFoundError";
  }
}

export class AtencionEnfermeriaPermissionDeniedError extends Error {
  constructor(message = "No tienes permisos para modificar esta atencion de enfermeria.") {
    super(message);
    this.name = "AtencionEnfermeriaPermissionDeniedError";
  }
}

export class AtencionEnfermeriaVersionConflictError extends Error {
  constructor(message = "La atencion cambio desde la ultima lectura y debes recargarla.") {
    super(message);
    this.name = "AtencionEnfermeriaVersionConflictError";
  }
}

export type AtencionesEnfermeriaRepository = {
  findAdultoMayorById(query: {
    adultoMayorId: string;
    scope: AtencionEnfermeriaScope;
  }): Promise<AtencionEnfermeriaAdultoRecord | null>;
  findMany(query: FindAtencionEnfermeriaListQuery): Promise<AtencionEnfermeriaListItemRecord[]>;
  findById(query: FindAtencionEnfermeriaByIdQuery): Promise<AtencionEnfermeriaDetailRecord | null>;
  findHistoryByAdultoMayor(
    query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
  ): Promise<AtencionEnfermeriaHistoryItemRecord[]>;
  findTrashByAdultoMayor(query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery): Promise<AtencionEnfermeriaHistoryItemRecord[]>;
  softDelete(command: { id: string; actorUserId: string; tenantId: string }): Promise<void>;
  restore(command: { id: string; actorUserId: string; tenantId: string }): Promise<void>;
  create(command: CreateAtencionEnfermeriaRecordCommand): Promise<AtencionEnfermeriaDetailRecord>;
  update(command: UpdateAtencionEnfermeriaRecordCommand): Promise<AtencionEnfermeriaDetailRecord>;
  findAdultoMayorScopeById(query: {
    adultoMayorId: string;
    scope: AtencionEnfermeriaScope;
  }): Promise<{ id: string; tenantId: string } | null>;
};
