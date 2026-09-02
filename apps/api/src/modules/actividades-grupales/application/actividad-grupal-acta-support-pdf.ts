import { InternalServerErrorException } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";

import { type ActividadGrupalSupportFileRecord } from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesFilesStorage } from "../domain/actividades-grupales-files.storage";

export async function prepareActividadGrupalActaSupportPdf(
  pdfFile: ActividadGrupalSupportFileRecord | null,
  filesStorage: ActividadesGrupalesFilesStorage,
): Promise<Buffer | null> {
  if (pdfFile === null) {
    return null;
  }

  try {
    const storedPdf = await filesStorage.readFile(
      pdfFile.relativePath,
      pdfFile.originalName,
      pdfFile.mimeType,
    );

    return storedPdf.buffer;
  } catch (error) {
    if (error instanceof InternalServerErrorException) {
      throw error;
    }

    throw new InternalServerErrorException(
      `No fue posible preparar el PDF "${pdfFile.originalName}" del acta.`,
      { cause: error },
    );
  }
}

export async function composeActividadGrupalActaPdf(
  pdfBuffers: readonly Buffer[],
): Promise<Buffer> {
  const composedPdf = await PDFDocument.create();

  try {
    for (const pdfBuffer of pdfBuffers) {
      const sourcePdf = await PDFDocument.load(pdfBuffer);
      const pages = await composedPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());

      for (const page of pages) {
        composedPdf.addPage(page);
      }
    }

    return Buffer.from(await composedPdf.save());
  } catch (error) {
    throw new InternalServerErrorException("No fue posible componer el PDF final del acta.", {
      cause: error,
    });
  }
}
