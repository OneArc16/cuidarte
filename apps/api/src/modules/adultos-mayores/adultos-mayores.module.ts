import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AdultosMayoresExportService } from "./application/adultos-mayores-export.service";
import { AdultosMayoresService } from "./application/adultos-mayores.service";
import { ADULTOS_MAYORES_REPOSITORY } from "./domain/adultos-mayores.repository";
import { DrizzleAdultosMayoresRepository } from "./infrastructure/drizzle-adultos-mayores.repository";
import { AdultosMayoresController } from "./presentation/adultos-mayores.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
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
