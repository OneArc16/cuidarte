export type ActividadGrupalGlobalSeriesRecord = {
  enabled: boolean;
  prefix: string | null;
  tenantCount: number;
  updatedAt: Date | null;
};

export type UpdateActividadGrupalGlobalSeriesCommand = {
  enabled: boolean;
  prefix: string | null;
  actorUserId: string;
};
