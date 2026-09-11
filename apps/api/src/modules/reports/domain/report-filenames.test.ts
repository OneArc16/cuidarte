import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildActaReportPdfFilename,
  buildAlimentacionReportPdfFilename,
  buildReportZipFilename,
  deduplicateFilename,
  normalizeReportFilenamePart,
} from "./report-filenames";

describe("report-filenames", () => {
  it("normalizes accents, spaces and punctuation", () => {
    assert.equal(normalizeReportFilenamePart("  María Gómez / Pérez  "), "MARIA_GOMEZ_PEREZ");
  });

  it("builds alimentacion PDF names with document, surnames, names and period", () => {
    assert.equal(
      buildAlimentacionReportPdfFilename({
        documentNumber: "10 20/30",
        surnames: "Gómez Pérez",
        names: "María Elena",
        period: "2026-08",
      }),
      "FORMATO_ENTREGA_10_20_30_GOMEZ_PEREZ_MARIA_ELENA_2026_08.pdf",
    );
  });

  it("marks imported alimentacion versions when provided", () => {
    assert.equal(
      buildAlimentacionReportPdfFilename({
        documentNumber: "1020304050",
        surnames: "Gómez",
        names: "María",
        period: "2026-08",
        importedVersion: 2,
      }),
      "FORMATO_ENTREGA_1020304050_GOMEZ_MARIA_2026_08_IMPORTADO_V2.pdf",
    );
  });

  it("builds acta PDF names independently", () => {
    assert.equal(
      buildActaReportPdfFilename({
        activityDate: "2026-08-15",
        actaNumber: "0042",
        descriptor: "Actividad física",
      }),
      "ACTA_SESION_GRUPAL_2026_08_15_0042_ACTIVIDAD_FISICA.pdf",
    );
  });

  it("builds zip names by report type", () => {
    assert.equal(
      buildReportZipFilename({
        type: "FORMATOS_ENTREGA_ALIMENTACION",
        tenantName: "Centro Vida Bogotá",
        period: "2026-08",
      }),
      "FORMATOS_ENTREGA_ALIMENTACION_CENTRO_VIDA_BOGOTA_2026_08.zip",
    );
  });

  it("deduplicates repeated filenames", () => {
    const used = new Set<string>();

    assert.equal(deduplicateFilename("ACTA.pdf", used), "ACTA.pdf");
    assert.equal(deduplicateFilename("ACTA.pdf", used), "ACTA_2.pdf");
  });
});
