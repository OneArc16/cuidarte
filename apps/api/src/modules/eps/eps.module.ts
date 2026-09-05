import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { EpsService } from "./application/eps.service";
import { EPS_REPOSITORY } from "./domain/eps.repository";
import { DrizzleEpsRepository } from "./infrastructure/drizzle-eps.repository";
import { EpsController } from "./presentation/eps.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [EpsController],
  providers: [
    EpsService,
    {
      provide: EPS_REPOSITORY,
      useClass: DrizzleEpsRepository,
    },
  ],
  exports: [EpsService],
})
export class EpsModule {}
