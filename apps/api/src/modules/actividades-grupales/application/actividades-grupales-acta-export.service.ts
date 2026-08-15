import { readFile } from "node:fs/promises";
import path from "node:path";

import { type AuthUser } from "@cuidarte/contracts";
import { Inject, Injectable, InternalServerErrorException } from "@nestjs/common";
import { chromium, type Browser } from "playwright";

import { ActividadesGrupalesService } from "./actividades-grupales.service";
import { prepareActividadGrupalActaPhotoAssets } from "./actividad-grupal-acta-photo-assets";
import {
  buildActividadGrupalActaPdfFilename,
  buildActividadGrupalActaPdfHtml,
} from "./actividad-grupal-acta-pdf-template";
import {
  ACTIVIDADES_GRUPALES_FILES_STORAGE,
  type ActividadesGrupalesFilesStorage,
} from "../domain/actividades-grupales-files.storage";
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
  constructor(
    private readonly actividadesGrupalesService: ActividadesGrupalesService,
    @Inject(ACTIVIDADES_GRUPALES_FILES_STORAGE)
    private readonly filesStorage: ActividadesGrupalesFilesStorage,
  ) {}

  async exportPdf(activityId: string, actor: AuthUser): Promise<ExportedActividadGrupalActaPdf> {
    const { detail, photoFiles } =
      await this.actividadesGrupalesService.getActividadGrupalActaExportData(activityId, actor);
    const [logoDataUrl, photoAssets] = await Promise.all([
      this.getLogoDataUrl(),
      prepareActividadGrupalActaPhotoAssets(photoFiles, this.filesStorage),
    ]);

    return {
      buffer: await this.renderPdf(detail, logoDataUrl, photoAssets),
      contentType: "application/pdf",
      filename: buildActividadGrupalActaPdfFilename(detail),
    };
  }

  private async renderPdf(
    detail: Awaited<
      ReturnType<ActividadesGrupalesService["getActividadGrupalActaExportData"]>
    >["detail"],
    logoDataUrl: string | null,
    photoAssets: Awaited<ReturnType<typeof prepareActividadGrupalActaPhotoAssets>>,
  ): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({
        headless: true,
        env: playwrightEnv.createPlaywrightLaunchEnv(),
      });
      const page = await browser.newPage();
      await page.setContent(buildActividadGrupalActaPdfHtml({ detail, logoDataUrl, photoAssets }), {
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
