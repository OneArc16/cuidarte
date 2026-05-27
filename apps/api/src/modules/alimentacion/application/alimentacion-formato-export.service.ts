import { readFile } from "node:fs/promises";
import path from "node:path";

import { type AlimentacionFormatoEntregaExportQuery, type AuthUser } from "@cuidarte/contracts";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium, type Browser } from "playwright";

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
  constructor(private readonly alimentacionService: AlimentacionService) {}

  async exportPdf(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<ExportedAlimentacionFormatoEntregaPdf> {
    const exportData = await this.alimentacionService.prepareFormatoEntregaExport(
      adultoMayorId,
      query,
      actor,
    );
    const logoDataUrl = await this.getLogoDataUrl();
    const pdfBuffer = await this.renderPdf(exportData, logoDataUrl);

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
      filename: buildFormatoEntregaPdfFilename(exportData.documentNumber, exportData.deliveryMonth),
    };
  }

  private async renderPdf(
    data: AlimentacionFormatoEntregaExportData,
    logoDataUrl: string | null,
  ): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.setContent(
        buildFormatoEntregaPdfHtml({
          data,
          generatedAt: new Date(),
          logoDataUrl,
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

  private async getLogoDataUrl(): Promise<string | null> {
    if (cachedLogoDataUrl !== undefined) {
      return cachedLogoDataUrl;
    }

    const logoBuffer = await readLogoFile();

    cachedLogoDataUrl =
      logoBuffer === null ? null : `data:image/png;base64,${logoBuffer.toString("base64")}`;

    return cachedLogoDataUrl;
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
