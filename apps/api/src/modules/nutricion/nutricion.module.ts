import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { NutricionService } from "./application/nutricion.service";
import { nutricionRepositoryProvider } from "./infrastructure/drizzle-nutricion.repository";
import { NutricionController } from "./presentation/nutricion.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [NutricionController],
  providers: [NutricionService, nutricionRepositoryProvider],
})
export class NutricionModule {}
