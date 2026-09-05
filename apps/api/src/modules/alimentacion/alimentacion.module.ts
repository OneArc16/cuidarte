import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EmpleadosModule } from "../empleados/empleados.module";
import { TenantBrandingModule } from "../tenant-branding/tenant-branding.module";
import { AlimentacionFormatoExportService } from "./application/alimentacion-formato-export.service";
import { AlimentacionImportedFormatoService } from "./application/alimentacion-imported-formato.service";
import { AlimentacionService } from "./application/alimentacion.service";
import { ALIMENTACION_FORMATO_FILES_STORAGE } from "./domain/alimentacion-formato-files.storage";
import { ALIMENTACION_REPOSITORY } from "./domain/alimentacion.repository";
import { LocalAlimentacionFormatoFilesStorage } from "./infrastructure/local-alimentacion-formato-files.storage";
import { DrizzleAlimentacionRepository } from "./infrastructure/drizzle-alimentacion.repository";
import { AlimentacionController } from "./presentation/alimentacion.controller";

@Module({
  imports: [AuthModule, DatabaseModule, EmpleadosModule, TenantBrandingModule],
  controllers: [AlimentacionController],
  providers: [
    AlimentacionService,
    AlimentacionFormatoExportService,
    AlimentacionImportedFormatoService,
    {
      provide: ALIMENTACION_REPOSITORY,
      useClass: DrizzleAlimentacionRepository,
    },
    {
      provide: ALIMENTACION_FORMATO_FILES_STORAGE,
      useClass: LocalAlimentacionFormatoFilesStorage,
    },
  ],
})
export class AlimentacionModule {}
