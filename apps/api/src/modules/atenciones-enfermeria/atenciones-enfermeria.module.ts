import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { AtencionesEnfermeriaService } from "./application/atenciones-enfermeria.service";
import { ATENCIONES_ENFERMERIA_REPOSITORY } from "./domain/atenciones-enfermeria.repository";
import { DrizzleAtencionesEnfermeriaRepository } from "./infrastructure/drizzle-atenciones-enfermeria.repository";
import { AtencionesEnfermeriaController } from "./presentation/atenciones-enfermeria.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AtencionesEnfermeriaController],
  providers: [
    AtencionesEnfermeriaService,
    {
      provide: ATENCIONES_ENFERMERIA_REPOSITORY,
      useClass: DrizzleAtencionesEnfermeriaRepository,
    },
  ],
})
export class AtencionesEnfermeriaModule {}
