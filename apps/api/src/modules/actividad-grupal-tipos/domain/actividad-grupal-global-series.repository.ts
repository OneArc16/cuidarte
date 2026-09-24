import {
  type ActividadGrupalGlobalSeriesRecord,
  type UpdateActividadGrupalGlobalSeriesCommand,
} from "./actividad-grupal-global-series.types";

export const ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY = Symbol(
  "ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY",
);

export type ActividadGrupalGlobalSeriesRepository = {
  findGlobalSeries(): Promise<ActividadGrupalGlobalSeriesRecord>;
  updateGlobalSeries(
    command: UpdateActividadGrupalGlobalSeriesCommand,
  ): Promise<ActividadGrupalGlobalSeriesRecord>;
};
