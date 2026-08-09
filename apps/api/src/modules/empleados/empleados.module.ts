import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EmpleadosSignatureService } from "./application/empleados-signature.service";
import { EmpleadosService } from "./application/empleados.service";
import { EMPLEADOS_SIGNATURE_FILES_STORAGE } from "./domain/empleados-signature-files.storage";
import { EMPLEADOS_REPOSITORY } from "./domain/empleados.repository";
import { DrizzleEmpleadosRepository } from "./infrastructure/drizzle-empleados.repository";
import { LocalEmpleadosSignatureFilesStorage } from "./infrastructure/local-empleados-signature-files.storage";
import { EmpleadosController } from "./presentation/empleados.controller";
import { TenantActiveSignerController } from "./presentation/tenant-active-signer.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EmpleadosController, TenantActiveSignerController],
  providers: [
    EmpleadosService,
    EmpleadosSignatureService,
    {
      provide: EMPLEADOS_REPOSITORY,
      useClass: DrizzleEmpleadosRepository,
    },
    {
      provide: EMPLEADOS_SIGNATURE_FILES_STORAGE,
      useClass: LocalEmpleadosSignatureFilesStorage,
    },
  ],
  exports: [EmpleadosService, EmpleadosSignatureService],
})
export class EmpleadosModule {}
