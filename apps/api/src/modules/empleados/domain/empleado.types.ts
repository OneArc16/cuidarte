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
    | "empleados.password_reset";
  targetTenantId: string | null;
  summary: string;
  metadata: Record<string, unknown>;
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
  createdAt: Date;
  updatedAt: Date;
};
