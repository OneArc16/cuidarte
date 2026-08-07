import { readFile } from "node:fs/promises";
import path from "node:path";

import { type AuthUser } from "@cuidarte/contracts";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium, type Browser } from "playwright";

import {
  buildActividadGrupalActaPdfFilename,
  buildActividadGrupalActaPdfHtml,
} from "./actividad-grupal-acta-pdf-template";
import { ActividadesGrupalesService } from "./actividades-grupales.service";
import playwrightEnv from "../../../common/playwright-env";

export type ExportedActividadGrupalActaPdf = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

const ACTIVIDAD_GRUPAL_LOGO_RELATIVE_PATH = path.join(
  "public",
  "logos",
  "gobernacion-magdalena.png",
);

let cachedLogoDataUrl: string | null | undefined;

@Injectable()
export class ActividadesGrupalesActaExportService {
  constructor(private readonly actividadesGrupalesService: ActividadesGrupalesService) {}

  async exportPdf(activityId: string, actor: AuthUser): Promise<ExportedActividadGrupalActaPdf> {
    const detail = await this.actividadesGrupalesService.getActividadGrupalDiligenciamiento(
      activityId,
      actor,
    );
    const logoDataUrl = await this.getLogoDataUrl();

    return {
      buffer: await this.renderPdf(detail, logoDataUrl),
      contentType: "application/pdf",
      filename: buildActividadGrupalActaPdfFilename(detail),
    };
  }

  private async renderPdf(
    detail: Awaited<ReturnType<ActividadesGrupalesService["getActividadGrupalDiligenciamiento"]>>,
    logoDataUrl: string | null,
  ): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({ headless: true, env: playwrightEnv.createPlaywrightLaunchEnv() });
      const page = await browser.newPage();
      await page.setContent(buildActividadGrupalActaPdfHtml({ detail, logoDataUrl }), {
        waitUntil: "load",
      });

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
      throw new InternalServerErrorException("No fue posible generar el PDF del acta.", {
        cause: error,
      });
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
    path.resolve(process.cwd(), "apps", "web", ACTIVIDAD_GRUPAL_LOGO_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", ACTIVIDAD_GRUPAL_LOGO_RELATIVE_PATH),
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
