import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { PsicologiaService } from "./application/psicologia.service";
import { PsicologiaController } from "./presentation/psicologia.controller";
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [PsicologiaController],
  providers: [PsicologiaService],
})
export class PsicologiaModule {}
