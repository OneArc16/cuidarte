import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { ActividadGrupalTiposModule } from "../actividad-grupal-tipos/actividad-grupal-tipos.module";
import { AuthModule } from "../auth/auth.module";
import { EmpleadosModule } from "../empleados/empleados.module";
import { ActividadesGrupalesActaExportService } from "./application/actividades-grupales-acta-export.service";
import { ActividadesGrupalesService } from "./application/actividades-grupales.service";
import { ActividadesGrupalesTrashService } from "./application/actividades-grupales-trash.service";
import { ACTIVIDADES_GRUPALES_FILES_STORAGE } from "./domain/actividades-grupales-files.storage";
import { ACTIVIDADES_GRUPALES_REPOSITORY } from "./domain/actividades-grupales.repository";
import { DrizzleActividadesGrupalesRepository } from "./infrastructure/drizzle-actividades-grupales.repository";
import { LocalActividadesGrupalesFilesStorage } from "./infrastructure/local-actividades-grupales-files.storage";
import { ActividadesGrupalesController } from "./presentation/actividades-grupales.controller";

@Module({
  imports: [ActividadGrupalTiposModule, AuthModule, DatabaseModule, EmpleadosModule],
  controllers: [ActividadesGrupalesController],
  providers: [
    ActividadesGrupalesActaExportService,
    ActividadesGrupalesService,
    ActividadesGrupalesTrashService,
    {
      provide: ACTIVIDADES_GRUPALES_REPOSITORY,
      useClass: DrizzleActividadesGrupalesRepository,
    },
    {
      provide: ACTIVIDADES_GRUPALES_FILES_STORAGE,
      useClass: LocalActividadesGrupalesFilesStorage,
    },
  ],
  exports: [ActividadesGrupalesActaExportService, ACTIVIDADES_GRUPALES_REPOSITORY],
})
export class ActividadesGrupalesModule {}
