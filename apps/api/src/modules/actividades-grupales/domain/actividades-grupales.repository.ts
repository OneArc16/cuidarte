import {
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalIntegranteOptionRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalReportCandidateRecord,
  type ActividadGrupalTrashRecord,
  type ActividadGrupalSupportFileRecord,
  type ActaCorrectionPreview,
  type AppliedActaCorrection,
  type ApplyActaCorrectionCommand,
  type CorrectActividadGrupalActaNumberCommand,
  type ActividadGrupalTenantOptionRecord,
  type CreateActividadGrupalRecordCommand,
  type DeleteActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
  type FindActividadesGrupalesTrashQuery,
  type FindActividadGrupalByIdQuery,
  type RestoreActividadGrupalRecordCommand,
  type SaveActividadGrupalDiligenciamientoRecordCommand,
  type SavedActividadGrupalDiligenciamientoRecord,
  type SearchActividadGrupalIntegrantesOptionsQuery,
  type UpdateActividadGrupalRecordCommand,
} from "./actividad-grupal.types";

export const ACTIVIDADES_GRUPALES_REPOSITORY = Symbol("ACTIVIDADES_GRUPALES_REPOSITORY");

export type ActividadesGrupalesRepository = {
  findMany(query: FindActividadesGrupalesQuery): Promise<ActividadGrupalRecord[]>;
  findTrashMany(query: FindActividadesGrupalesTrashQuery): Promise<ActividadGrupalTrashRecord[]>;
  findById(
    query: FindActividadGrupalByIdQuery,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord | null>;
  findTrashById(query: FindActividadGrupalByIdQuery): Promise<ActividadGrupalTrashRecord | null>;
  findTenantOptions(): Promise<ActividadGrupalTenantOptionRecord[]>;
  findActaReportCandidates?(query: {
    tenantId: string;
    period: string;
  }): Promise<ActividadGrupalReportCandidateRecord[]>;
  findActiveEmpleadoOptions(tenantId: string): Promise<ActividadGrupalEmpleadoOptionRecord[]>;
  searchIntegranteOptions(
    query: SearchActividadGrupalIntegrantesOptionsQuery,
  ): Promise<ActividadGrupalIntegranteOptionRecord[]>;
  findIntegrantesByIds(
    tenantId: string,
    integranteIds: string[],
  ): Promise<ActividadGrupalIntegranteOptionRecord[]>;
  create(command: CreateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord>;
  update(command: UpdateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord>;
  correctActaNumber(
    command: CorrectActividadGrupalActaNumberCommand,
  ): Promise<ActividadGrupalRecord>;
  previewActaNumberCorrection(
    tenantId: string,
    actorUserId: string,
  ): Promise<ActaCorrectionPreview>;
  applyActaNumberCorrection(command: ApplyActaCorrectionCommand): Promise<AppliedActaCorrection>;
  delete(command: DeleteActividadGrupalRecordCommand): Promise<void>;
  restore(command: RestoreActividadGrupalRecordCommand): Promise<boolean>;
  saveDiligenciamiento(
    command: SaveActividadGrupalDiligenciamientoRecordCommand,
  ): Promise<SavedActividadGrupalDiligenciamientoRecord>;
};
