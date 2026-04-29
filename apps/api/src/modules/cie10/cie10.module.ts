import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { Cie10Service } from "./application/cie10.service";
import { CIE10_REPOSITORY } from "./domain/cie10.repository";
import { DrizzleCie10Repository } from "./infrastructure/drizzle-cie10.repository";
import { Cie10Controller } from "./presentation/cie10.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [Cie10Controller],
  providers: [
    Cie10Service,
    {
      provide: CIE10_REPOSITORY,
      useClass: DrizzleCie10Repository,
    },
  ],
})
export class Cie10Module {}
