import {
  type CreateAndActivateTenantLogoCommand,
  type RemoveActiveTenantLogoCommand,
  type TenantLogoVersionRecord,
} from "./tenant-branding.types";

export const TENANT_BRANDING_REPOSITORY = Symbol("TENANT_BRANDING_REPOSITORY");

export type TenantBrandingRepository = {
  tenantExists(tenantId: string): Promise<boolean>;
  findActiveLogoByTenantId(tenantId: string): Promise<TenantLogoVersionRecord | null>;
  createAndActivateLogo(
    command: CreateAndActivateTenantLogoCommand,
  ): Promise<TenantLogoVersionRecord>;
  removeActiveLogo(command: RemoveActiveTenantLogoCommand): Promise<void>;
};
