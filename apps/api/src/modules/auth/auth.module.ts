import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RolesGuard } from "./roles.guard";
import { SessionGuard } from "./session.guard";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, RolesGuard, SessionGuard],
  exports: [AuthService, RolesGuard, SessionGuard],
})
export class AuthModule {}
