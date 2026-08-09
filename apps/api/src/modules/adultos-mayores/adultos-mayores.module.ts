import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EpsModule } from "../eps/eps.module";
import { AdultosMayoresExportService } from "./application/adultos-mayores-export.service";
import { AdultosMayoresService } from "./application/adultos-mayores.service";
import { ADULTOS_MAYORES_REPOSITORY } from "./domain/adultos-mayores.repository";
import { DrizzleAdultosMayoresRepository } from "./infrastructure/drizzle-adultos-mayores.repository";
import { AdultosMayoresController } from "./presentation/adultos-mayores.controller";
import { UbicacionesModule } from "../ubicaciones/ubicaciones.module";

@Module({
  imports: [AuthModule, DatabaseModule, EpsModule, UbicacionesModule],
  controllers: [AdultosMayoresController],
  providers: [
    AdultosMayoresService,
    AdultosMayoresExportService,
    {
      provide: ADULTOS_MAYORES_REPOSITORY,
      useClass: DrizzleAdultosMayoresRepository,
    },
  ],
})
export class AdultosMayoresModule {}
