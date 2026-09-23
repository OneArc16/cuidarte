import {
  type ActividadGrupalTipoRecord,
  type CreateActividadGrupalTipoCommand,
  type FindActividadGrupalTiposQuery,
  type UpdateActividadGrupalTipoCommand,
  type UpdateActividadGrupalTipoStatusCommand,
  type UpdateActividadGrupalTipoConsecutiveConfigCommand,
} from "./actividad-grupal-tipo.types";

export const ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY = Symbol("ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY");

export type ActividadGrupalTiposRepository = {
  findMany(query: FindActividadGrupalTiposQuery): Promise<ActividadGrupalTipoRecord[]>;
  findById(id: string): Promise<ActividadGrupalTipoRecord | null>;
  findByTenantAndNormalizedName(
    tenantId: string,
    normalizedName: string,
  ): Promise<ActividadGrupalTipoRecord | null>;
  create(command: CreateActividadGrupalTipoCommand): Promise<ActividadGrupalTipoRecord>;
  update(command: UpdateActividadGrupalTipoCommand): Promise<ActividadGrupalTipoRecord>;
  updateStatus(command: UpdateActividadGrupalTipoStatusCommand): Promise<ActividadGrupalTipoRecord>;
  updateConsecutiveConfig(
    command: UpdateActividadGrupalTipoConsecutiveConfigCommand,
  ): Promise<ActividadGrupalTipoRecord>;
};
