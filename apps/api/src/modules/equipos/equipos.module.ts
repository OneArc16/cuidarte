import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { EquiposService } from "./application/equipos.service";
import { EQUIPOS_REPOSITORY } from "./domain/equipos.repository";
import { DrizzleEquiposRepository } from "./infrastructure/drizzle-equipos.repository";
import { EquiposController } from "./presentation/equipos.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EquiposController],
  providers: [
    EquiposService,
    { provide: EQUIPOS_REPOSITORY, useClass: DrizzleEquiposRepository },
  ],
})
export class EquiposModule {}
