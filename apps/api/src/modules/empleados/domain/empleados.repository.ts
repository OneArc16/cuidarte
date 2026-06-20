import {
  type AssignDirectorSignatureCommand,
  type CreateEmpleadoRecordCommand,
  type CreateEmpleadoSignatureVersionCommand,
  type DirectorSignatureAssignmentRecord,
  type DirectorSignatureMonthResolutionRecord,
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
  type FindEmpleadoSignatureVersionByIdQuery,
  type EmpleadoTenantOptionRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadosQuery,
  type ResolveDirectorSignatureForMonthQuery,
  type UpdateEmpleadoRecordCommand,
} from "./empleado.types";

export const EMPLEADOS_REPOSITORY = Symbol("EMPLEADOS_REPOSITORY");

export type EmpleadosRepository = {
  findMany(query: FindEmpleadosQuery): Promise<EmpleadoRecord[]>;
  findById(query: FindEmpleadoByIdQuery): Promise<EmpleadoRecord | null>;
  findByEmail(query: FindEmpleadoByEmailQuery): Promise<EmpleadoRecord | null>;
  findByDocument(query: FindEmpleadoByDocumentQuery): Promise<EmpleadoRecord | null>;
  findTenantOptions(): Promise<EmpleadoTenantOptionRecord[]>;
  findLatestSignatureVersionByEmployeeId(
    employeeId: string,
  ): Promise<EmpleadoSignatureVersionRecord | null>;
  findSignatureVersionById(
    query: FindEmpleadoSignatureVersionByIdQuery,
  ): Promise<EmpleadoSignatureVersionRecord | null>;
  findCurrentDirectorSignatureAssignmentByEmployeeId(
    employeeId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null>;
  findLatestDirectorSignatureAssignmentByTenantId(
    tenantId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null>;
  resolveDirectorSignatureForMonth(
    query: ResolveDirectorSignatureForMonthQuery,
  ): Promise<DirectorSignatureMonthResolutionRecord[]>;
  create(command: CreateEmpleadoRecordCommand, audit: EmpleadoAuditCommand): Promise<EmpleadoRecord>;
  update(
    command: UpdateEmpleadoRecordCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<EmpleadoRecord>;
  createSignatureVersion(
    command: CreateEmpleadoSignatureVersionCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoSignatureVersionRecord>;
  assignDirectorSignature(
    command: AssignDirectorSignatureCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<DirectorSignatureAssignmentRecord>;
};
