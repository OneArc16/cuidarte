import {
  type CreateEmpleadoRecordCommand,
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type EmpleadoTenantOptionRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadosQuery,
  type UpdateEmpleadoRecordCommand,
} from "./empleado.types";

export const EMPLEADOS_REPOSITORY = Symbol("EMPLEADOS_REPOSITORY");

export type EmpleadosRepository = {
  findMany(query: FindEmpleadosQuery): Promise<EmpleadoRecord[]>;
  findById(query: FindEmpleadoByIdQuery): Promise<EmpleadoRecord | null>;
  findByEmail(query: FindEmpleadoByEmailQuery): Promise<EmpleadoRecord | null>;
  findByDocument(query: FindEmpleadoByDocumentQuery): Promise<EmpleadoRecord | null>;
  findTenantOptions(): Promise<EmpleadoTenantOptionRecord[]>;
  create(command: CreateEmpleadoRecordCommand, audit: EmpleadoAuditCommand): Promise<EmpleadoRecord>;
  update(
    command: UpdateEmpleadoRecordCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<EmpleadoRecord>;
};
