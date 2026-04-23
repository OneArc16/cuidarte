import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EmpleadosService } from "./application/empleados.service";
import { EMPLEADOS_REPOSITORY } from "./domain/empleados.repository";
import { DrizzleEmpleadosRepository } from "./infrastructure/drizzle-empleados.repository";
import { EmpleadosController } from "./presentation/empleados.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EmpleadosController],
  providers: [
    EmpleadosService,
    {
      provide: EMPLEADOS_REPOSITORY,
      useClass: DrizzleEmpleadosRepository,
    },
  ],
})
export class EmpleadosModule {}
