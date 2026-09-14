export type ActividadGrupalTipoRecord = {
  id: string;
  tenantId: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deactivatedAt: Date | null;
};

export type FindActividadGrupalTiposQuery = {
  tenantId: string | null;
  includeInactive: boolean;
};

export type CreateActividadGrupalTipoCommand = {
  tenantId: string;
  actorUserId: string;
  name: string;
  normalizedName: string;
};

export type UpdateActividadGrupalTipoCommand = {
  id: string;
  actorUserId: string;
  name: string;
  normalizedName: string;
};

export type UpdateActividadGrupalTipoStatusCommand = {
  id: string;
  actorUserId: string;
  isActive: boolean;
};
