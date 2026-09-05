import { readFile } from "node:fs/promises";
import path from "node:path";

import { type ActividadGrupalDiligenciamientoDetail, type AuthUser } from "@cuidarte/contracts";
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { chromium, type Browser } from "playwright";

import { ActividadesGrupalesService } from "./actividades-grupales.service";
import { prepareActividadGrupalActaPhotoAssets } from "./actividad-grupal-acta-photo-assets";
import {
  composeActividadGrupalActaPdf,
  prepareActividadGrupalActaSupportPdf,
} from "./actividad-grupal-acta-support-pdf";
import {
  type ActividadGrupalActaPdfDetail,
  buildActividadGrupalActaPhotoEvidencePdfHtml,
  buildActividadGrupalActaPdfFilename,
  buildActividadGrupalActaPdfHtml,
} from "./actividad-grupal-acta-pdf-template";
import {
  ACTIVIDADES_GRUPALES_FILES_STORAGE,
  type ActividadesGrupalesFilesStorage,
} from "../domain/actividades-grupales-files.storage";
import { EmpleadosSignatureService } from "../../empleados/application/empleados-signature.service";
import {
  EMPLEADOS_REPOSITORY,
  type EmpleadosRepository,
} from "../../empleados/domain/empleados.repository";
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
    @Inject(EMPLEADOS_REPOSITORY)
    private readonly empleadosRepository: EmpleadosRepository,
    private readonly empleadosSignatureService: EmpleadosSignatureService,
    @Inject(ACTIVIDADES_GRUPALES_FILES_STORAGE)
    private readonly filesStorage: ActividadesGrupalesFilesStorage,
  ) {}

  async exportPdf(activityId: string, actor: AuthUser): Promise<ExportedActividadGrupalActaPdf> {
    const { detail, photoFiles, pdfFile } =
      await this.actividadesGrupalesService.getActividadGrupalActaExportData(activityId, actor);
    const [detailWithSignatures, logoDataUrl, photoAssets, supportPdf] = await Promise.all([
      hydrateActividadGrupalActaPdfDetailWithSignatures(detail, {
        empleadosRepository: this.empleadosRepository,
        empleadosSignatureService: this.empleadosSignatureService,
      }),
      this.getLogoDataUrl(),
      prepareActividadGrupalActaPhotoAssets(photoFiles, this.filesStorage),
      prepareActividadGrupalActaSupportPdf(pdfFile, this.filesStorage),
    ]);
    const actaPdf = await this.renderPdfHtml(
      buildActividadGrupalActaPdfHtml({
        detail: detailWithSignatures,
        logoDataUrl,
        photoAssets: [],
      }),
    );
    const photoPdf =
      photoAssets.length === 0
        ? null
        : await this.renderPdfHtml(buildActividadGrupalActaPhotoEvidencePdfHtml(photoAssets));
    const orderedPdfParts = [actaPdf, supportPdf, photoPdf].filter(
      (pdfPart): pdfPart is Buffer => pdfPart !== null,
    );

    return {
      buffer: await composeActividadGrupalActaPdf(orderedPdfParts),
      contentType: "application/pdf",
      filename: buildActividadGrupalActaPdfFilename(detailWithSignatures),
    };
  }

  private async renderPdfHtml(html: string): Promise<Buffer> {
    let browser: Browser | undefined;

    try {
      browser = await chromium.launch({
        headless: true,
        env: playwrightEnv.createPlaywrightLaunchEnv(),
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });

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

export async function hydrateActividadGrupalActaPdfDetailWithSignatures(
  detail: ActividadGrupalDiligenciamientoDetail,
  dependencies: {
    empleadosRepository: Pick<EmpleadosRepository, "findLatestSignatureVersionByEmployeeId">;
    empleadosSignatureService: Pick<EmpleadosSignatureService, "readSignatureFile">;
  },
): Promise<ActividadGrupalActaPdfDetail> {
  const assignedProfessionals = await Promise.all(
    detail.assignedProfessionals.map(async (professional) => {
      const latestSignature =
        await dependencies.empleadosRepository.findLatestSignatureVersionByEmployeeId(
          professional.id,
        );

      if (latestSignature === null) {
        return { ...professional, signatureDataUrl: null };
      }

      try {
        const file = await dependencies.empleadosSignatureService.readSignatureFile({
          relativePath: latestSignature.relativePath,
          originalName: latestSignature.originalName,
          mimeType: latestSignature.mimeType,
        });

        return {
          ...professional,
          signatureDataUrl: `data:${file.contentType};base64,${file.buffer.toString("base64")}`,
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          return { ...professional, signatureDataUrl: null };
        }

        throw error;
      }
    }),
  );

  return {
    ...detail,
    assignedProfessionals,
  };
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
