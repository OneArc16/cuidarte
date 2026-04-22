import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { BackofficeController } from "./backoffice.controller";
import { BackofficeService } from "./backoffice.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
