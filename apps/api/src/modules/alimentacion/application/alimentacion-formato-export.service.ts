import { readFile } from "node:fs/promises";
import path from "node:path";

import { type AlimentacionFormatoEntregaExportQuery, type AuthUser } from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { chromium, type Browser } from "playwright";

import { EmpleadosSignatureService } from "../../empleados/application/empleados-signature.service";
import { TenantBrandingService } from "../../tenant-branding/application/tenant-branding.service";
import {
  ALIMENTACION_FORMATO_FILES_STORAGE,
  type AlimentacionFormatoFilesStorage,
} from "../domain/alimentacion-formato-files.storage";
import {
  buildFormatoEntregaPdfFilename,
  buildFormatoEntregaPdfHtml,
} from "./alimentacion-formato-pdf-template";
import { AlimentacionService } from "./alimentacion.service";
import { type AlimentacionFormatoEntregaExportData } from "./alimentacion-formato-export.types";
import playwrightEnv from "../../../common/playwright-env";

export type ExportedAlimentacionFormatoEntregaPdf = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

type ResolvedDirectorSignature = Awaited<
  ReturnType<EmpleadosSignatureService["resolveTenantActiveDirectorSignature"]>
>;
type ResolvedTenantLogoVersion = Awaited<ReturnType<TenantBrandingService["resolveActiveLogo"]>>;
type CurrentFormatoDependencies = {
  directorSignature: ResolvedDirectorSignature;
  tenantLogoVersion: ResolvedTenantLogoVersion;
};

const INSTITUTIONAL_LOGO_RELATIVE_PATH = path.join("public", "logos", "gobernacion-magdalena.png");
const DATED_VISIT_LIST_FORMAT_ROLLOUT_AT = new Date("2026-09-01T18:27:35.000Z");

let cachedInstitutionalLogoDataUrl: string | null | undefined;

@Injectable()
export class AlimentacionFormatoExportService {
  constructor(
    private readonly alimentacionService: AlimentacionService,
    private readonly empleadosSignatureService: EmpleadosSignatureService,
    private readonly tenantBrandingService: TenantBrandingService,
    @Inject(ALIMENTACION_FORMATO_FILES_STORAGE)
    private readonly formatoFilesStorage: AlimentacionFormatoFilesStorage,
  ) {}

  async exportPdf(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<ExportedAlimentacionFormatoEntregaPdf> {
    const generatedAt = new Date();
    const exportData = await this.alimentacionService.prepareFormatoEntregaExport(
      adultoMayorId,
      query,
      actor,
    );
    const existingEmission = await this.alimentacionService.findLatestFormatoEntregaEmission(
      adultoMayorId,
      query,
      actor,
    );
    const currentDependenciesForReuse =
      existingEmission === null
        ? null
        : await this.tryResolveCurrentFormatoDependencies(exportData.tenantId);

    if (
      existingEmission !== null &&
      currentDependenciesForReuse !== null &&
      this.shouldReuseExistingEmission(existingEmission, exportData, currentDependenciesForReuse)
    ) {
      await this.getDirectorSignatureDataUrl(
        currentDependenciesForReuse.directorSignature.signature,
      );
      const storedFile = await this.readStoredEmission(existingEmission);

      if (storedFile !== null) {
        await this.alimentacionService.registerFormatoEntregaExportAudit(
          {
            tenantId: existingEmission.tenantId,
            adultoMayorId: existingEmission.adultoMayorId,
            deliveryMonth: existingEmission.deliveryMonth,
          },
          actor,
        );

        return storedFile;
      }
    }
    const { directorSignature, tenantLogoVersion } =
      currentDependenciesForReuse ??
      (await this.resolveCurrentFormatoDependencies(exportData.tenantId));
    const [institutionalLogoDataUrl, directorSignatureDataUrl, tenantLogoFile] = await Promise.all([
      this.getInstitutionalLogoDataUrl(),
      this.getDirectorSignatureDataUrl(directorSignature.signature),
      this.tenantBrandingService.readLogoVersionFile(tenantLogoVersion),
    ]);
    const tenantLogoDataUrl = `data:${tenantLogoFile.contentType};base64,${tenantLogoFile.buffer.toString("base64")}`;
    const pdfBuffer = await this.renderPdf(
      exportData,
      institutionalLogoDataUrl,
      tenantLogoDataUrl,
      directorSignatureDataUrl,
    );
    const filename = buildFormatoEntregaPdfFilename(
      exportData.documentNumber,
      exportData.deliveryMonth,
    );
    const storedFile = await this.formatoFilesStorage.saveFile(
      {
        tenantId: exportData.tenantId,
        adultoMayorId: exportData.adultoMayorId,
        deliveryMonth: exportData.deliveryMonth,
      },
      {
        filename,
        contentType: "application/pdf",
        buffer: pdfBuffer,
      },
    );

    try {
      await this.alimentacionService.createFormatoEntregaEmission({
        tenantId: exportData.tenantId,
        adultoMayorId: exportData.adultoMayorId,
        deliveryMonth: exportData.deliveryMonth,
        signerEmployeeIdSnapshot: directorSignature.activeSigner.employeeId,
        signerNameSnapshot: directorSignature.employeeFullName,
        signerRoleSnapshot: directorSignature.employeeRole,
        signatureVersionIdSnapshot: directorSignature.signature.id,
        tenantLogoVersionIdSnapshot: tenantLogoVersion.id,
        filename: storedFile.filename,
        pdfRelativePath: storedFile.relativePath,
        sourceRecordCount: exportData.records.length,
        sourceDateFrom: exportData.records[0]?.deliveryDate ?? null,
        sourceDateTo: exportData.records.at(-1)?.deliveryDate ?? null,
        issuedByUserId: actor.id,
        issuedAt: generatedAt,
      });
    } catch (error) {
      await this.deleteStoredPdfBestEffort(storedFile.relativePath);
      throw error;
    }

    await this.alimentacionService.registerFormatoEntregaExportAudit(
      {
        tenantId: exportData.tenantId,
        adultoMayorId: exportData.adultoMayorId,
        deliveryMonth: exportData.deliveryMonth,
      },
      actor,
    );

    return {
      buffer: pdfBuffer,
      contentType: "application/pdf",
      filename,
    };
  }

  private async renderPdf(
    data: AlimentacionFormatoEntregaExportData,
    institutionalLogoDataUrl: string | null,
    tenantLogoDataUrl: string,
    directorSignatureDataUrl: string | null,
  ): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({
        headless: true,
        env: playwrightEnv.createPlaywrightLaunchEnv(),
      });
      const page = await browser.newPage();
      await page.setContent(
        buildFormatoEntregaPdfHtml({
          data,
          institutionalLogoDataUrl,
          tenantLogoDataUrl,
          directorSignatureDataUrl,
        }),
        {
          waitUntil: "load",
        },
      );

      return Buffer.from(
        await page.pdf({
          width: "216mm",
          height: "279mm",
          printBackground: true,
          preferCSSPageSize: true,
          margin: {
            top: "0",
            right: "0",
            bottom: "0",
            left: "0",
          },
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException("No fue posible generar el formato de alimentacion.", {
        cause: error,
      });
    } finally {
      await browser?.close();
    }
  }

  private async readStoredEmission(emission: {
    pdfRelativePath: string;
    filename: string;
  }): Promise<ExportedAlimentacionFormatoEntregaPdf | null> {
    try {
      const file = await this.formatoFilesStorage.readFile(
        emission.pdfRelativePath,
        emission.filename,
        "application/pdf",
      );

      return {
        buffer: file.buffer,
        contentType: file.contentType,
        filename: file.filename,
      };
    } catch (error) {
      if (isMissingFileError(error)) {
        return null;
      }

      throw new InternalServerErrorException(
        "No fue posible recuperar el formato historico de alimentacion.",
        {
          cause: error,
        },
      );
    }
  }

  private async getDirectorSignatureDataUrl(signature: {
    relativePath: string;
    originalName: string;
    mimeType: string;
  }): Promise<string> {
    try {
      const file = await this.empleadosSignatureService.readSignatureFile(signature);

      return `data:${normalizeInlineImageContentType(file.contentType)};base64,${file.buffer.toString("base64")}`;
    } catch (error) {
      if (isMissingFileError(error)) {
        throw new ConflictException(
          "El archivo de la firma activa no esta disponible. Carga una nueva firma y actualiza el firmante activo antes de exportar.",
          { cause: error },
        );
      }

      throw error;
    }
  }

  private shouldReuseExistingEmission(
    existingEmission: {
      issuedAt: Date;
      signerEmployeeIdSnapshot: string;
      signatureVersionIdSnapshot: string;
      tenantLogoVersionIdSnapshot: string | null;
      sourceRecordCount: number;
      sourceDateFrom: string | null;
      sourceDateTo: string | null;
    },
    exportData: AlimentacionFormatoEntregaExportData,
    currentDependencies: CurrentFormatoDependencies,
  ): boolean {
    if (existingEmission.issuedAt < DATED_VISIT_LIST_FORMAT_ROLLOUT_AT) {
      return false;
    }

    if (
      existingEmission.signerEmployeeIdSnapshot !==
        currentDependencies.directorSignature.activeSigner.employeeId ||
      existingEmission.signatureVersionIdSnapshot !==
        currentDependencies.directorSignature.signature.id ||
      existingEmission.tenantLogoVersionIdSnapshot !== currentDependencies.tenantLogoVersion.id
    ) {
      return false;
    }

    if (
      currentDependencies.directorSignature.activeSigner.activatedAt > existingEmission.issuedAt ||
      currentDependencies.directorSignature.signature.createdAt > existingEmission.issuedAt ||
      currentDependencies.tenantLogoVersion.createdAt > existingEmission.issuedAt
    ) {
      return false;
    }

    const latestRecordUpdatedAt = getLatestRecordUpdatedAt(exportData);

    if (latestRecordUpdatedAt !== null && latestRecordUpdatedAt > existingEmission.issuedAt) {
      return false;
    }

    return (
      existingEmission.sourceRecordCount === exportData.records.length &&
      existingEmission.sourceDateFrom === (exportData.records[0]?.deliveryDate ?? null) &&
      existingEmission.sourceDateTo === (exportData.records.at(-1)?.deliveryDate ?? null)
    );
  }

  private async getInstitutionalLogoDataUrl(): Promise<string | null> {
    if (cachedInstitutionalLogoDataUrl !== undefined) {
      return cachedInstitutionalLogoDataUrl;
    }

    const logoBuffer = await readLogoFile();

    cachedInstitutionalLogoDataUrl =
      logoBuffer === null ? null : `data:image/png;base64,${logoBuffer.toString("base64")}`;

    return cachedInstitutionalLogoDataUrl;
  }

  private async deleteStoredPdfBestEffort(relativePath: string) {
    try {
      await this.formatoFilesStorage.deleteFile(relativePath);
    } catch {
      return;
    }
  }

  private async resolveCurrentFormatoDependencies(
    tenantId: string,
  ): Promise<CurrentFormatoDependencies> {
    const [directorSignature, tenantLogoVersion] = await Promise.all([
      this.empleadosSignatureService.resolveTenantActiveDirectorSignature(tenantId),
      this.tenantBrandingService.resolveActiveLogo(tenantId),
    ]);

    return {
      directorSignature,
      tenantLogoVersion,
    };
  }

  private async tryResolveCurrentFormatoDependencies(
    tenantId: string,
  ): Promise<CurrentFormatoDependencies | null> {
    try {
      return await this.resolveCurrentFormatoDependencies(tenantId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        return null;
      }

      throw error;
    }
  }
}

async function readLogoFile(): Promise<Buffer | null> {
  const candidatePaths = [
    path.resolve(process.cwd(), "apps", "web", INSTITUTIONAL_LOGO_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", INSTITUTIONAL_LOGO_RELATIVE_PATH),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      return await readFile(candidatePath);
    } catch {
      continue;
    }
  }

  return null;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function getLatestRecordUpdatedAt(exportData: AlimentacionFormatoEntregaExportData): Date | null {
  let latestTimestamp: number | null = null;

  for (const record of exportData.records) {
    const recordTimestamp = record.updatedAt.getTime();

    if (Number.isNaN(recordTimestamp)) {
      continue;
    }

    if (latestTimestamp === null || recordTimestamp > latestTimestamp) {
      latestTimestamp = recordTimestamp;
    }
  }

  return latestTimestamp === null ? null : new Date(latestTimestamp);
}

function normalizeInlineImageContentType(contentType: string): string {
  return contentType === "image/jpg" ? "image/jpeg" : contentType;
}
