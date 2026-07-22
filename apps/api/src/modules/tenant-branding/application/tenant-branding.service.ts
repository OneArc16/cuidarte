import {
  type AuthUser,
  type TenantLogoMetadata,
  tenantLogoMetadataSchema,
} from "@cuidarte/contracts";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  TENANT_BRANDING_REPOSITORY,
  type TenantBrandingRepository,
} from "../domain/tenant-branding.repository";
import {
  type BufferedTenantLogoUpload,
  type TenantLogoVersionRecord,
} from "../domain/tenant-branding.types";
import {
  TENANT_LOGO_FILES_STORAGE,
  type ReadTenantLogoFile,
  type TenantLogoFilesStorage,
} from "../domain/tenant-logo-files.storage";
import { TenantLogoImageProcessor } from "./tenant-logo-image-processor";

const MISSING_LOGO_MESSAGE =
  "El centro no tiene un logo configurado. Solicita al administrador cargarlo antes de exportar el formato.";

@Injectable()
export class TenantBrandingService {
  constructor(
    @Inject(TENANT_BRANDING_REPOSITORY)
    private readonly repository: TenantBrandingRepository,
    @Inject(TENANT_LOGO_FILES_STORAGE)
    private readonly filesStorage: TenantLogoFilesStorage,
    private readonly imageProcessor: TenantLogoImageProcessor,
  ) {}

  async uploadLogo(
    tenantId: string,
    upload: BufferedTenantLogoUpload,
    actor: AuthUser,
  ): Promise<TenantLogoMetadata> {
    this.ensureSuperAdmin(actor);
    await this.ensureTenantExists(tenantId);

    const processed = await this.imageProcessor.process(upload);
    const storedFile = await this.filesStorage.saveFile({ tenantId }, { buffer: processed.buffer });

    try {
      const version = await this.repository.createAndActivateLogo({
        tenantId,
        originalName: sanitizeOriginalName(upload.originalName),
        mimeType: processed.mimeType,
        sizeBytes: processed.sizeBytes,
        checksum: processed.checksum,
        relativePath: storedFile.relativePath,
        actorUserId: actor.id,
      });

      return this.toMetadata(version);
    } catch (error) {
      await this.deleteFileBestEffort(storedFile.relativePath);
      throw error;
    }
  }

  async removeActiveLogo(tenantId: string, actor: AuthUser): Promise<void> {
    this.ensureSuperAdmin(actor);
    await this.ensureTenantExists(tenantId);
    await this.repository.removeActiveLogo({ tenantId, actorUserId: actor.id });
  }

  async getAdministrativeLogo(
    tenantId: string,
    actor: AuthUser,
  ): Promise<TenantLogoMetadata | null> {
    this.ensureSuperAdmin(actor);
    await this.ensureTenantExists(tenantId);
    const version = await this.repository.findActiveLogoByTenantId(tenantId);

    return version === null ? null : this.toMetadata(version);
  }

  async getAdministrativeLogoFile(
    tenantId: string,
    actor: AuthUser,
  ): Promise<{ file: ReadTenantLogoFile; version: TenantLogoVersionRecord }> {
    this.ensureSuperAdmin(actor);
    await this.ensureTenantExists(tenantId);
    const version = await this.repository.findActiveLogoByTenantId(tenantId);

    if (version === null) {
      throw new NotFoundException("El centro no tiene un logo activo.");
    }

    return {
      file: await this.readLogoVersionFile(version),
      version,
    };
  }

  async resolveActiveLogo(tenantId: string): Promise<TenantLogoVersionRecord> {
    const version = await this.repository.findActiveLogoByTenantId(tenantId);

    if (version === null) {
      throw new ConflictException(MISSING_LOGO_MESSAGE);
    }

    return version;
  }

  async readLogoVersionFile(version: TenantLogoVersionRecord): Promise<ReadTenantLogoFile> {
    return await this.filesStorage.readFile(version.relativePath);
  }

  private async ensureTenantExists(tenantId: string): Promise<void> {
    if (!(await this.repository.tenantExists(tenantId))) {
      throw new NotFoundException("Tenant no encontrado.");
    }
  }

  private ensureSuperAdmin(actor: Pick<AuthUser, "role">): void {
    if (actor.role !== "super_admin") {
      throw new ForbiddenException("Solo un SuperAdmin puede administrar el logo del centro.");
    }
  }

  private toMetadata(version: TenantLogoVersionRecord): TenantLogoMetadata {
    return tenantLogoMetadataSchema.parse({
      versionId: version.id,
      originalName: version.originalName,
      mimeType: version.mimeType,
      sizeBytes: version.sizeBytes,
      checksum: version.checksum,
      updatedAt: version.createdAt.toISOString(),
    });
  }

  private async deleteFileBestEffort(relativePath: string): Promise<void> {
    try {
      await this.filesStorage.deleteFile(relativePath);
    } catch {
      // La metadata no fue persistida; un proceso operativo puede limpiar este archivo huerfano.
    }
  }
}

function sanitizeOriginalName(originalName: string): string {
  const sanitized = originalName
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/]/g, "-")
    .trim()
    .slice(0, 260);

  return sanitized === "" ? "logo" : sanitized;
}
