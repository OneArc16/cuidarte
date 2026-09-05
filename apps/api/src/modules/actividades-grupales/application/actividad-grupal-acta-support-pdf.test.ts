import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";

import {
  composeActividadGrupalActaPdf,
  prepareActividadGrupalActaSupportPdf,
} from "./actividad-grupal-acta-support-pdf";
import { type ActividadGrupalSupportFileRecord } from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesFilesStorage } from "../domain/actividades-grupales-files.storage";

describe("actividad-grupal-acta-support-pdf", () => {
  it("returns null when the acta has no attached PDF", async () => {
    const storage = createStorage(Buffer.from("unused"));

    assert.equal(await prepareActividadGrupalActaSupportPdf(null, storage), null);
    assert.equal(storage.reads, 0);
  });

  it("reads the attached PDF from storage", async () => {
    const buffer = Buffer.from("%PDF soporte");
    const storage = createStorage(buffer);
    const result = await prepareActividadGrupalActaSupportPdf(createPdfFile(), storage);

    assert.equal(result, buffer);
    assert.equal(storage.reads, 1);
  });

  it("composes PDF buffers preserving the requested order", async () => {
    const actaPdf = await createPdfWithPages(1, [216, 279]);
    const supportPdf = await createPdfWithPages(2, [300, 400]);
    const photoPdf = await createPdfWithPages(1, [180, 220]);

    const composed = await PDFDocument.load(
      await composeActividadGrupalActaPdf([actaPdf, supportPdf, photoPdf]),
    );

    assert.equal(composed.getPageCount(), 4);
    assert.deepEqual(
      composed.getPages().map((page) => [page.getWidth(), page.getHeight()]),
      [
        [216, 279],
        [300, 400],
        [300, 400],
        [180, 220],
      ],
    );
  });
});

function createStorage(buffer: Buffer): ActividadesGrupalesFilesStorage & { reads: number } {
  return {
    reads: 0,
    async saveFile() {
      throw new Error("not implemented");
    },
    async readFile() {
      this.reads += 1;

      return {
        buffer,
        contentType: "application/pdf",
        originalName: "soporte.pdf",
      };
    },
    async deleteFile() {
      throw new Error("not implemented");
    },
  };
}

function createPdfFile(): ActividadGrupalSupportFileRecord {
  return {
    id: "pdf-1",
    activityId: "actividad-1",
    kind: "support_pdf",
    originalName: "soporte.pdf",
    mimeType: "application/pdf",
    sizeBytes: 123,
    relativePath: "tenant/actividad/pdf/soporte.pdf",
    createdAt: new Date("2026-08-15T10:00:00.000Z"),
  };
}

async function createPdfWithPages(
  pageCount: number,
  size: [width: number, height: number],
): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage(size);
    page.drawText(`Pagina ${index + 1}`, { x: 24, y: size[1] - 24, font, size: 12 });
  }

  return Buffer.from(await pdf.save());
}
