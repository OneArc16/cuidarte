import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { UbicacionesService } from "./application/ubicaciones.service";
import { UBICACIONES_REPOSITORY } from "./domain/ubicaciones.repository";
import { DrizzleUbicacionesRepository } from "./infrastructure/drizzle-ubicaciones.repository";
import { UbicacionesController } from "./presentation/ubicaciones.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [UbicacionesController],
  providers: [
    UbicacionesService,
    {
      provide: UBICACIONES_REPOSITORY,
      useClass: DrizzleUbicacionesRepository,
    },
  ],
  exports: [UbicacionesService],
})
export class UbicacionesModule {}
