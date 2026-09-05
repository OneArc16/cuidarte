import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EpsModule } from "../eps/eps.module";
import { AdultosMayoresImportService } from "./application/adultos-mayores-import.service";
import { AdultosMayoresImportTemplateService } from "./application/adultos-mayores-import-template.service";
import { AdultosMayoresExportService } from "./application/adultos-mayores-export.service";
import { AdultosMayoresService } from "./application/adultos-mayores.service";
import { ADULTOS_MAYORES_IMPORT_REPOSITORY } from "./domain/adultos-mayores-import.repository";
import { ADULTOS_MAYORES_REPOSITORY } from "./domain/adultos-mayores.repository";
import { AdultosMayoresImportParser } from "./domain/adultos-mayores-import-parser";
import { AdultosMayoresImportValidator } from "./domain/adultos-mayores-import-validator";
import { DrizzleAdultosMayoresRepository } from "./infrastructure/drizzle-adultos-mayores.repository";
import { DrizzleAdultosMayoresImportRepository } from "./infrastructure/drizzle-adultos-mayores-import.repository";
import { AdultosMayoresImportController } from "./presentation/adultos-mayores-import.controller";
import { AdultosMayoresController } from "./presentation/adultos-mayores.controller";
import { UbicacionesModule } from "../ubicaciones/ubicaciones.module";

@Module({
  imports: [AuthModule, DatabaseModule, EpsModule, UbicacionesModule],
  controllers: [AdultosMayoresController, AdultosMayoresImportController],
  providers: [
    AdultosMayoresService,
    AdultosMayoresExportService,
    AdultosMayoresImportService,
    AdultosMayoresImportTemplateService,
    AdultosMayoresImportParser,
    AdultosMayoresImportValidator,
    {
      provide: ADULTOS_MAYORES_REPOSITORY,
      useClass: DrizzleAdultosMayoresRepository,
    },
    {
      provide: ADULTOS_MAYORES_IMPORT_REPOSITORY,
      useClass: DrizzleAdultosMayoresImportRepository,
    },
  ],
})
export class AdultosMayoresModule {}
