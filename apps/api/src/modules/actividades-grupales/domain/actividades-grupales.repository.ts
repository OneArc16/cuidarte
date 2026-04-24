import {
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalIntegranteOptionRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalTenantOptionRecord,
  type CreateActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
  type FindActividadGrupalByIdQuery,
  type SaveActividadGrupalDiligenciamientoRecordCommand,
  type SavedActividadGrupalDiligenciamientoRecord,
  type SearchActividadGrupalIntegrantesOptionsQuery,
} from "./actividad-grupal.types";

export const ACTIVIDADES_GRUPALES_REPOSITORY = Symbol("ACTIVIDADES_GRUPALES_REPOSITORY");

export type ActividadesGrupalesRepository = {
  findMany(query: FindActividadesGrupalesQuery): Promise<ActividadGrupalRecord[]>;
  findById(
    query: FindActividadGrupalByIdQuery,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord | null>;
  findTenantOptions(): Promise<ActividadGrupalTenantOptionRecord[]>;
  findActiveEmpleadoOptions(tenantId: string): Promise<ActividadGrupalEmpleadoOptionRecord[]>;
  searchIntegranteOptions(
    query: SearchActividadGrupalIntegrantesOptionsQuery,
  ): Promise<ActividadGrupalIntegranteOptionRecord[]>;
  findIntegrantesByIds(
    tenantId: string,
    integranteIds: string[],
  ): Promise<ActividadGrupalIntegranteOptionRecord[]>;
  getNextActaNumber(tenantId: string): Promise<number>;
  create(command: CreateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord>;
  saveDiligenciamiento(
    command: SaveActividadGrupalDiligenciamientoRecordCommand,
  ): Promise<SavedActividadGrupalDiligenciamientoRecord>;
};
