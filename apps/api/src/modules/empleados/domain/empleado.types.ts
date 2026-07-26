import { type UserRole } from "@cuidarte/contracts";

export type EmpleadosScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindEmpleadosQuery = {
  search: string | null;
  scope: EmpleadosScope;
};

export type FindEmpleadoByIdQuery = {
  id: string;
  scope: EmpleadosScope;
};

export type FindEmpleadoByEmailQuery = {
  email: string;
  excludeId?: string;
};

export type FindEmpleadoByDocumentQuery = {
  tenantId: string | null;
  documentNumber: string;
  excludeId?: string;
};

export type EmpleadoTenantOptionRecord = {
  id: string;
  name: string;
};

export type BufferedEmpleadoSignatureUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

export type EmpleadoSignatureVersionRecord = {
  id: string;
  employeeId: string;
  tenantId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  relativePath: string;
  createdAt: Date;
};

export type DirectorSignatureAssignmentRecord = {
  id: string;
  tenantId: string;
  employeeId: string;
  signatureVersionId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: Date;
};

export type DirectorSignatureAssignmentHistoryRecord =
  DirectorSignatureAssignmentRecord & {
    employeeFullName: string;
    signatureOriginalName: string;
  };

export type EmpleadoCommandRecord = {
  tenantId: string | null;
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  documentNumber: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  passwordHash?: string;
};

export type CreateEmpleadoRecordCommand = EmpleadoCommandRecord & {
  passwordHash: string;
};

export type UpdateEmpleadoRecordCommand = Omit<EmpleadoCommandRecord, "tenantId"> & {
  id: string;
};

export type EmpleadoAuditCommand = {
  actorUserId: string;
  action:
    | "empleados.created"
    | "empleados.updated"
    | "empleados.activated"
    | "empleados.deactivated"
    | "empleados.password_reset"
    | "empleados.signature_uploaded"
    | "empleados.director_signature_assigned"
    | "empleados.director_signature_assignment_closed";
  targetTenantId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
};

export type CreateEmpleadoSignatureVersionCommand = {
  employeeId: string;
  tenantId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  relativePath: string;
  uploadedByUserId: string;
};

export type FindEmpleadoSignatureVersionByIdQuery = {
  employeeId: string;
  signatureVersionId: string;
};

export type AssignDirectorSignatureCommand = {
  tenantId: string;
  employeeId: string;
  signatureVersionId: string;
  effectiveFrom: string;
  createdByUserId: string;
};

export type ResolveDirectorSignatureForDateQuery = {
  tenantId: string;
  effectiveDate: string;
};

export type DirectorSignatureDateResolutionRecord = {
  assignment: DirectorSignatureAssignmentRecord;
  employeeFullName: string;
  employeeRole: UserRole;
  signature: EmpleadoSignatureVersionRecord;
};

export type EmpleadoRecord = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  email: string;
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  documentNumber: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  isTenantOwner: boolean;
  latestSignature: EmpleadoSignatureVersionRecord | null;
  currentDirectorSignatureAssignment: DirectorSignatureAssignmentRecord | null;
  directorSignatureAssignmentHistory: DirectorSignatureAssignmentHistoryRecord[];
  createdAt: Date;
  updatedAt: Date;
};
