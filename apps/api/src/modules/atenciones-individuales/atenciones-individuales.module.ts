import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AtencionesIndividualesService } from "./application/atenciones-individuales.service";
import { ATENCIONES_INDIVIDUALES_FILES_STORAGE } from "./domain/atenciones-individuales-files.storage";
import { ATENCIONES_INDIVIDUALES_REPOSITORY } from "./domain/atenciones-individuales.repository";
import { DrizzleAtencionesIndividualesRepository } from "./infrastructure/drizzle-atenciones-individuales.repository";
import { LocalAtencionesIndividualesFilesStorage } from "./infrastructure/local-atenciones-individuales-files.storage";
import { AtencionesIndividualesController } from "./presentation/atenciones-individuales.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AtencionesIndividualesController],
  providers: [
    AtencionesIndividualesService,
    {
      provide: ATENCIONES_INDIVIDUALES_REPOSITORY,
      useClass: DrizzleAtencionesIndividualesRepository,
    },
    {
      provide: ATENCIONES_INDIVIDUALES_FILES_STORAGE,
      useClass: LocalAtencionesIndividualesFilesStorage,
    },
  ],
})
export class AtencionesIndividualesModule {}
