import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TenantBrandingModule } from "../tenant-branding/tenant-branding.module";
import { BackofficeController } from "./backoffice.controller";
import { BackofficeService } from "./backoffice.service";

@Module({
  imports: [AuthModule, DatabaseModule, TenantBrandingModule],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
