import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBulkImportModeMonth,
  BulkImportValidationError,
  normalizeBulkDocumentNumber,
  parseBulkImportFilename,
} from "./alimentacion-bulk-import";

test("parsea el documento y el mes desde el nombre canonico", () => {
  assert.deepEqual(parseBulkImportFilename("30029339-2026-09.pdf"), {
    documentNumber: "30029339",
    normalizedDocumentNumber: "30029339",
    deliveryMonth: "2026-09",
  });
});

test("rechaza nombres que no incluyen documento y mes", () => {
  assert.throws(
    () => parseBulkImportFilename("formato-diligenciado.pdf"),
    (error: unknown) =>
      error instanceof BulkImportValidationError && error.reasonCode === "INVALID_FILENAME",
  );
});

test("obliga el mes seleccionado en el modo mensual", () => {
  assert.throws(
    () => assertBulkImportModeMonth("month", "2026-09", "2026-08"),
    (error: unknown) =>
      error instanceof BulkImportValidationError && error.reasonCode === "INVALID_MONTH",
  );
  assert.doesNotThrow(() => assertBulkImportModeMonth("all", null, "2026-08"));
});

test("normaliza separadores y mayusculas del documento", () => {
  assert.equal(normalizeBulkDocumentNumber("cc-30.029.339"), "CC30029339");
});
