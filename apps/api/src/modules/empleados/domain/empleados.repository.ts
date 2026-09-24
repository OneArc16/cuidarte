import { type UserPermission } from "@cuidarte/contracts";

import {
  type CreateEmpleadoRecordCommand,
  type CreateEmpleadoSignatureVersionCommand,
  type DirectorSignatureAssignmentRecord,
  type DirectorSignatureAssignmentHistoryRecord,
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
  type FindEmpleadoSignatureVersionByIdQuery,
  type EmpleadoTenantOptionRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadosQuery,
  type ClearTenantActiveSignerCommand,
  type SetTenantActiveSignerCommand,
  type TenantActiveSignerRecord,
  type TenantActiveSignerResolutionRecord,
  type UpdateEmpleadoRecordCommand,
  type ReplaceEmpleadoPermissionsCommand,
} from "./empleado.types";

export const EMPLEADOS_REPOSITORY = Symbol("EMPLEADOS_REPOSITORY");

export type EmpleadosRepository = {
  findMany(query: FindEmpleadosQuery): Promise<EmpleadoRecord[]>;
  findById(query: FindEmpleadoByIdQuery): Promise<EmpleadoRecord | null>;
  findByEmail(query: FindEmpleadoByEmailQuery): Promise<EmpleadoRecord | null>;
  findByDocument(query: FindEmpleadoByDocumentQuery): Promise<EmpleadoRecord | null>;
  findTenantOptions(): Promise<EmpleadoTenantOptionRecord[]>;
  findPermissionsByUserId(userId: string): Promise<UserPermission[]>;
  replacePermissions(
    command: ReplaceEmpleadoPermissionsCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<void>;
  findLatestSignatureVersionByEmployeeId(
    employeeId: string,
  ): Promise<EmpleadoSignatureVersionRecord | null>;
  findSignatureVersionById(
    query: FindEmpleadoSignatureVersionByIdQuery,
  ): Promise<EmpleadoSignatureVersionRecord | null>;
  findTenantActiveSignerByTenantId(tenantId: string): Promise<TenantActiveSignerRecord | null>;
  resolveTenantActiveDirectorSignatureByTenantId(
    tenantId: string,
  ): Promise<TenantActiveSignerResolutionRecord | null>;
  findCurrentDirectorSignatureAssignmentByEmployeeId(
    employeeId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null>;
  findLatestDirectorSignatureAssignmentByTenantId(
    tenantId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null>;
  findDirectorSignatureAssignmentHistoryByTenantId(
    tenantId: string,
  ): Promise<DirectorSignatureAssignmentHistoryRecord[]>;
  create(
    command: CreateEmpleadoRecordCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoRecord>;
  update(
    command: UpdateEmpleadoRecordCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<EmpleadoRecord>;
  createSignatureVersion(
    command: CreateEmpleadoSignatureVersionCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoSignatureVersionRecord>;
  setTenantActiveSigner(
    command: SetTenantActiveSignerCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<TenantActiveSignerRecord>;
  clearTenantActiveSigner(
    command: ClearTenantActiveSignerCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<TenantActiveSignerRecord | null>;
};
