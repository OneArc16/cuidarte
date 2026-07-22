import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TenantBrandingService } from "./application/tenant-branding.service";
import { TenantLogoImageProcessor } from "./application/tenant-logo-image-processor";
import { TENANT_BRANDING_REPOSITORY } from "./domain/tenant-branding.repository";
import { TENANT_LOGO_FILES_STORAGE } from "./domain/tenant-logo-files.storage";
import { DrizzleTenantBrandingRepository } from "./infrastructure/drizzle-tenant-branding.repository";
import { LocalTenantLogoFilesStorage } from "./infrastructure/local-tenant-logo-files.storage";
import { TenantBrandingController } from "./presentation/tenant-branding.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TenantBrandingController],
  providers: [
    TenantBrandingService,
    TenantLogoImageProcessor,
    {
      provide: TENANT_BRANDING_REPOSITORY,
      useClass: DrizzleTenantBrandingRepository,
    },
    {
      provide: TENANT_LOGO_FILES_STORAGE,
      useClass: LocalTenantLogoFilesStorage,
    },
  ],
  exports: [TenantBrandingService],
})
export class TenantBrandingModule {}
