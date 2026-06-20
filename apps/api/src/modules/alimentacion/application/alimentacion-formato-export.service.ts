import { readFile } from "node:fs/promises";
import path from "node:path";

import { type AlimentacionFormatoEntregaExportQuery, type AuthUser } from "@cuidarte/contracts";
import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium, type Browser } from "playwright";

import { EmpleadosSignatureService } from "../../empleados/application/empleados-signature.service";
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

export type ExportedAlimentacionFormatoEntregaPdf = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

const ALIMENTACION_LOGO_RELATIVE_PATH = path.join(
  "public",
  "logos",
  "gobernacion-magdalena.png",
);

let cachedLogoDataUrl: string | null | undefined;

@Injectable()
export class AlimentacionFormatoExportService {
  constructor(
    private readonly alimentacionService: AlimentacionService,
    private readonly empleadosSignatureService: EmpleadosSignatureService,
    @Inject(ALIMENTACION_FORMATO_FILES_STORAGE)
    private readonly formatoFilesStorage: AlimentacionFormatoFilesStorage,
  ) {}

  async exportPdf(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<ExportedAlimentacionFormatoEntregaPdf> {
    const existingEmission = await this.alimentacionService.findLatestFormatoEntregaEmission(
      adultoMayorId,
      query,
      actor,
    );

    if (existingEmission !== null) {
      const storedFile = await this.readStoredEmission(existingEmission);

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

    const exportData = await this.alimentacionService.prepareFormatoEntregaExport(
      adultoMayorId,
      query,
      actor,
    );
    const directorSignature = await this.empleadosSignatureService.resolveDirectorSignatureForMonth(
      exportData.tenantId,
      exportData.deliveryMonth,
    );
    const [logoDataUrl, directorSignatureDataUrl] = await Promise.all([
      this.getLogoDataUrl(),
      this.getDirectorSignatureDataUrl(directorSignature.signature),
    ]);
    const generatedAt = new Date();
    const pdfBuffer = await this.renderPdf(
      exportData,
      logoDataUrl,
      directorSignatureDataUrl,
      generatedAt,
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
        signerEmployeeIdSnapshot: directorSignature.assignment.employeeId,
        signerNameSnapshot: directorSignature.employeeFullName,
        signerRoleSnapshot: directorSignature.employeeRole,
        signatureVersionIdSnapshot: directorSignature.signature.id,
        filename: storedFile.filename,
        pdfRelativePath: storedFile.relativePath,
        sourceRecordCount: exportData.records.length,
        sourceDateFrom: exportData.records[0]?.deliveryDate ?? null,
        sourceDateTo: exportData.records.at(-1)?.deliveryDate ?? null,
        issuedByUserId: actor.id,
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
    logoDataUrl: string | null,
    directorSignatureDataUrl: string,
    generatedAt: Date,
  ): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(
        buildFormatoEntregaPdfHtml({
          data,
          generatedAt,
          logoDataUrl,
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
      throw new InternalServerErrorException(
        "No fue posible generar el formato de alimentacion.",
        { cause: error },
      );
    } finally {
      await browser?.close();
    }
  }

  private async readStoredEmission(emission: {
    pdfRelativePath: string;
    filename: string;
  }): Promise<ExportedAlimentacionFormatoEntregaPdf> {
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
      throw new InternalServerErrorException(
        "No fue posible recuperar el formato historico de alimentacion.",
        { cause: error },
      );
    }
  }

  private async getDirectorSignatureDataUrl(signature: {
    relativePath: string;
    originalName: string;
    mimeType: string;
  }): Promise<string> {
    const file = await this.empleadosSignatureService.readSignatureFile(signature);

    return `data:${file.contentType};base64,${file.buffer.toString("base64")}`;
  }

  private async getLogoDataUrl(): Promise<string | null> {
    if (cachedLogoDataUrl !== undefined) {
      return cachedLogoDataUrl;
    }

    const logoBuffer = await readLogoFile();

    cachedLogoDataUrl =
      logoBuffer === null ? null : `data:image/png;base64,${logoBuffer.toString("base64")}`;

    return cachedLogoDataUrl;
  }

  private async deleteStoredPdfBestEffort(relativePath: string) {
    try {
      await this.formatoFilesStorage.deleteFile(relativePath);
    } catch {
      return;
    }
  }
}

async function readLogoFile(): Promise<Buffer | null> {
  const candidatePaths = [
    path.resolve(process.cwd(), "apps", "web", ALIMENTACION_LOGO_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", ALIMENTACION_LOGO_RELATIVE_PATH),
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
