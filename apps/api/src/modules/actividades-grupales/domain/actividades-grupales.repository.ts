import {
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalTenantOptionRecord,
  type CreateActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
} from "./actividad-grupal.types";

export const ACTIVIDADES_GRUPALES_REPOSITORY = Symbol("ACTIVIDADES_GRUPALES_REPOSITORY");

export type ActividadesGrupalesRepository = {
  findMany(query: FindActividadesGrupalesQuery): Promise<ActividadGrupalRecord[]>;
  findTenantOptions(): Promise<ActividadGrupalTenantOptionRecord[]>;
  findActiveEmpleadoOptions(tenantId: string): Promise<ActividadGrupalEmpleadoOptionRecord[]>;
  getNextActaNumber(tenantId: string): Promise<number>;
  create(command: CreateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord>;
};
