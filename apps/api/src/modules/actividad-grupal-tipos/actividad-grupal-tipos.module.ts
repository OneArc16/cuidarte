import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ActividadGrupalTiposService } from "./application/actividad-grupal-tipos.service";
import { ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY } from "./domain/actividad-grupal-tipos.repository";
import { DrizzleActividadGrupalTiposRepository } from "./infrastructure/drizzle-actividad-grupal-tipos.repository";
import { ActividadGrupalTiposController } from "./presentation/actividad-grupal-tipos.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ActividadGrupalTiposController],
  providers: [
    ActividadGrupalTiposService,
    {
      provide: ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY,
      useClass: DrizzleActividadGrupalTiposRepository,
    },
  ],
  exports: [ActividadGrupalTiposService, ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY],
})
export class ActividadGrupalTiposModule {}
