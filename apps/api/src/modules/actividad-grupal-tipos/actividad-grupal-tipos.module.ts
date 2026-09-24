import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ActividadGrupalGlobalSeriesService } from "./application/actividad-grupal-global-series.service";
import { ActividadGrupalTiposService } from "./application/actividad-grupal-tipos.service";
import { ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY } from "./domain/actividad-grupal-global-series.repository";
import { ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY } from "./domain/actividad-grupal-tipos.repository";
import { DrizzleActividadGrupalGlobalSeriesRepository } from "./infrastructure/drizzle-actividad-grupal-global-series.repository";
import { DrizzleActividadGrupalTiposRepository } from "./infrastructure/drizzle-actividad-grupal-tipos.repository";
import { ActividadGrupalTiposController } from "./presentation/actividad-grupal-tipos.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ActividadGrupalTiposController],
  providers: [
    ActividadGrupalGlobalSeriesService,
    ActividadGrupalTiposService,
    {
      provide: ACTIVIDAD_GRUPAL_GLOBAL_SERIES_REPOSITORY,
      useClass: DrizzleActividadGrupalGlobalSeriesRepository,
    },
    {
      provide: ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY,
      useClass: DrizzleActividadGrupalTiposRepository,
    },
  ],
  exports: [
    ActividadGrupalGlobalSeriesService,
    ActividadGrupalTiposService,
    ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY,
  ],
})
export class ActividadGrupalTiposModule {}
