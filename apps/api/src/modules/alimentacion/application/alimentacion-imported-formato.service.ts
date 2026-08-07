import {
  type AlimentacionFormatoEntregaExportQuery,
  type AlimentacionImportedFormatoUploadResponse,
  type AlimentacionImportedFormatoVersion,
  type AuthUser,
  alimentacionImportedFormatoUploadResponseSchema,
  alimentacionImportedFormatoVersionSchema,
} from "@cuidarte/contracts";
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";

import {
  canAccessAlimentacion,
  canManageAlimentacion,
  resolveAlimentacionScope,
} from "../domain/alimentacion.policy";
import {
  ALIMENTACION_FORMATO_FILES_STORAGE,
  AlimentacionFormatoStoredFileNotFoundError,
  type AlimentacionFormatoFilesStorage,
} from "../domain/alimentacion-formato-files.storage";
import { validateAlimentacionImportedFormatoPdf } from "../domain/alimentacion-imported-formato-pdf";
import {
  ALIMENTACION_REPOSITORY,
  type AlimentacionRepository,
} from "../domain/alimentacion.repository";
import {
  type AlimentacionImportedFormatoVersionRecord,
  type BufferedAlimentacionFormatoPdfUpload,
} from "../domain/alimentacion.types";

@Injectable()
export class AlimentacionImportedFormatoService {
  constructor(
    @Inject(ALIMENTACION_REPOSITORY)
    private readonly alimentacionRepository: AlimentacionRepository,
    @Inject(ALIMENTACION_FORMATO_FILES_STORAGE)
    private readonly formatoFilesStorage: AlimentacionFormatoFilesStorage,
  ) {}

  async importPdf(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    upload: BufferedAlimentacionFormatoPdfUpload,
    actor: AuthUser,
  ): Promise<AlimentacionImportedFormatoUploadResponse> {
    this.ensureCanManage(actor);
    const adultoMayor = await this.getAccessibleAdultoMayorOrThrow(adultoMayorId, actor);
    const validatedUpload = validateAlimentacionImportedFormatoPdf(upload);
    let storedFile: Awaited<ReturnType<AlimentacionFormatoFilesStorage["saveFile"]>> | null = null;

    try {
      storedFile = await this.formatoFilesStorage.saveFile(
        {
          tenantId: adultoMayor.tenantId,
          adultoMayorId,
          deliveryMonth: query.deliveryMonth,
        },
        {
          filename: validatedUpload.originalName,
          contentType: validatedUpload.mimeType,
          buffer: validatedUpload.buffer,
        },
      );
      const version = await this.alimentacionRepository.createImportedFormatoVersion({
        tenantId: adultoMayor.tenantId,
        adultoMayorId,
        deliveryMonth: query.deliveryMonth,
        originalName: validatedUpload.originalName,
        storedName: storedFile.storedName,
        pdfRelativePath: storedFile.relativePath,
        mimeType: validatedUpload.mimeType,
        sizeBytes: validatedUpload.sizeBytes,
        importedByUserId: actor.id,
        importedAt: new Date(),
      });

      return alimentacionImportedFormatoUploadResponseSchema.parse({
        version: this.toContractVersion(version),
      });
    } catch (error) {
      if (storedFile !== null) {
        await this.formatoFilesStorage.deleteFile(storedFile.relativePath).catch(() => undefined);
      }

      if (error instanceof Error && "status" in error) {
        throw error;
      }

      throw new InternalServerErrorException(
        "No fue posible almacenar el formato de alimentacion importado.",
        { cause: error },
      );
    }
  }

  async listVersions(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<AlimentacionImportedFormatoVersion[]> {
    this.ensureCanAccess(actor);
    const adultoMayor = await this.getAccessibleAdultoMayorOrThrow(adultoMayorId, actor);
    const versions = await this.alimentacionRepository.findImportedFormatoVersions({
      tenantId: adultoMayor.tenantId,
      adultoMayorId,
      deliveryMonth: query.deliveryMonth,
    });

    return versions.map((version) => this.toContractVersion(version));
  }

  async downloadVersion(adultoMayorId: string, versionId: string, actor: AuthUser) {
    this.ensureCanAccess(actor);
    const adultoMayor = await this.getAccessibleAdultoMayorOrThrow(adultoMayorId, actor);
    const version = await this.alimentacionRepository.findImportedFormatoVersionById({
      id: versionId,
      tenantId: adultoMayor.tenantId,
      adultoMayorId,
    });

    if (version === null) {
      throw new NotFoundException("La version importada del formato no fue encontrada.");
    }

    try {
      const file = await this.formatoFilesStorage.readFile(
        version.pdfRelativePath,
        version.originalName,
        version.mimeType,
      );

      await this.alimentacionRepository.createImportedFormatoDownloadAudit({
        actorUserId: actor.id,
        targetTenantId: version.tenantId,
        adultoMayorId: version.adultoMayorId,
        deliveryMonth: version.deliveryMonth,
        versionId: version.id,
        version: version.version,
      });

      return file;
    } catch (error) {
      if (error instanceof AlimentacionFormatoStoredFileNotFoundError) {
        throw new NotFoundException("El archivo importado no esta disponible.");
      }

      if (error instanceof Error && "status" in error) {
        throw error;
      }

      throw new InternalServerErrorException(
        "No fue posible recuperar el formato de alimentacion importado.",
        { cause: error },
      );
    }
  }

  private async getAccessibleAdultoMayorOrThrow(adultoMayorId: string, actor: AuthUser) {
    const scope = resolveAlimentacionScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar alimentacion.");
    }

    const adultoMayor = await this.alimentacionRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    return adultoMayor;
  }

  private ensureCanAccess(actor: Pick<AuthUser, "role">) {
    if (!canAccessAlimentacion(actor)) {
      throw new ForbiddenException("No tienes permisos para consultar alimentacion.");
    }
  }

  private ensureCanManage(actor: Pick<AuthUser, "role">) {
    if (!canManageAlimentacion(actor)) {
      throw new ForbiddenException("No tienes permisos para importar formatos de alimentacion.");
    }
  }

  private toContractVersion(
    version: AlimentacionImportedFormatoVersionRecord,
  ): AlimentacionImportedFormatoVersion {
    return alimentacionImportedFormatoVersionSchema.parse({
      id: version.id,
      version: version.version,
      originalName: version.originalName,
      mimeType: version.mimeType,
      sizeBytes: version.sizeBytes,
      importedByUserId: version.importedByUserId,
      importedByUserFullName: version.importedByUserFullName,
      importedAt: version.importedAt.toISOString(),
    });
  }
}
