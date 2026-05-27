import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AlimentacionFormatoExportService } from "./application/alimentacion-formato-export.service";
import { AlimentacionService } from "./application/alimentacion.service";
import { ALIMENTACION_REPOSITORY } from "./domain/alimentacion.repository";
import { DrizzleAlimentacionRepository } from "./infrastructure/drizzle-alimentacion.repository";
import { AlimentacionController } from "./presentation/alimentacion.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AlimentacionController],
  providers: [
    AlimentacionService,
    AlimentacionFormatoExportService,
    {
      provide: ALIMENTACION_REPOSITORY,
      useClass: DrizzleAlimentacionRepository,
    },
  ],
})
export class AlimentacionModule {}
