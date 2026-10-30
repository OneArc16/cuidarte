import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { FisioterapiaService } from "./application/fisioterapia.service";
import { FisioterapiaController } from "./presentation/fisioterapia.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [FisioterapiaController],
  providers: [FisioterapiaService],
})
export class FisioterapiaModule {}
