import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { ActividadesGrupalesService } from "./application/actividades-grupales.service";
import { ACTIVIDADES_GRUPALES_REPOSITORY } from "./domain/actividades-grupales.repository";
import { DrizzleActividadesGrupalesRepository } from "./infrastructure/drizzle-actividades-grupales.repository";
import { ActividadesGrupalesController } from "./presentation/actividades-grupales.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ActividadesGrupalesController],
  providers: [
    ActividadesGrupalesService,
    {
      provide: ACTIVIDADES_GRUPALES_REPOSITORY,
      useClass: DrizzleActividadesGrupalesRepository,
    },
  ],
})
export class ActividadesGrupalesModule {}
