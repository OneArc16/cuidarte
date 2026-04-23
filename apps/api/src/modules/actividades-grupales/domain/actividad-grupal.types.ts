import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalType,
  type UserRole,
} from "@cuidarte/contracts";

export type ActividadesGrupalesScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindActividadesGrupalesQuery = {
  search: string | null;
  activityType: ActividadGrupalType | null;
  tenantId: string | null;
  scope: ActividadesGrupalesScope;
};

export type ActividadGrupalTenantOptionRecord = {
  id: string;
  name: string;
};

export type ActividadGrupalEmpleadoOptionRecord = {
  id: string;
  fullName: string;
  role: UserRole;
};

export type CreateActividadGrupalRecordCommand = {
  tenantId: string;
  actorUserId: string;
  activityName: string;
  activityType: ActividadGrupalType;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  employeeIds: string[];
};

export type ActividadGrupalRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  actaNumber: number;
  activityName: string;
  activityType: ActividadGrupalType;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalOrganizer;
  involvedEmployeesCount: number;
  createdAt: Date;
  updatedAt: Date;
};
