import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import {
  MAX_ALIMENTACION_FORMATO_PDF_SIZE_BYTES,
  validateAlimentacionImportedFormatoPdf,
} from "./alimentacion-imported-formato-pdf";

describe("validateAlimentacionImportedFormatoPdf", () => {
  it("accepts a PDF with a valid signature", () => {
    const result = validateAlimentacionImportedFormatoPdf(createUpload());

    assert.equal(result.originalName, "formato.pdf");
    assert.equal(result.mimeType, "application/pdf");
  });

  it("rejects empty files", () => {
    assert.throws(
      () => validateAlimentacionImportedFormatoPdf(createUpload({ buffer: Buffer.alloc(0) })),
      BadRequestException,
    );
  });

  it("rejects an invalid MIME type", () => {
    assert.throws(
      () => validateAlimentacionImportedFormatoPdf(createUpload({ mimeType: "text/plain" })),
      BadRequestException,
    );
  });

  it("rejects an invalid extension", () => {
    assert.throws(
      () => validateAlimentacionImportedFormatoPdf(createUpload({ originalName: "formato.txt" })),
      BadRequestException,
    );
  });

  it("rejects content without the initial PDF signature", () => {
    assert.throws(
      () =>
        validateAlimentacionImportedFormatoPdf(createUpload({ buffer: Buffer.from("not a pdf") })),
      BadRequestException,
    );
  });

  it("rejects files larger than 10 MiB", () => {
    const buffer = Buffer.alloc(MAX_ALIMENTACION_FORMATO_PDF_SIZE_BYTES + 1);
    Buffer.from("%PDF-").copy(buffer);

    assert.throws(
      () => validateAlimentacionImportedFormatoPdf(createUpload({ buffer })),
      BadRequestException,
    );
  });

  it("rejects filenames with path traversal", () => {
    assert.throws(
      () =>
        validateAlimentacionImportedFormatoPdf(createUpload({ originalName: "../formato.pdf" })),
      BadRequestException,
    );
  });
});

function createUpload(
  overrides: Partial<{ originalName: string; mimeType: string; buffer: Buffer }> = {},
) {
  const buffer = overrides.buffer ?? Buffer.from("%PDF-1.7\ncontenido");

  return {
    originalName: overrides.originalName ?? "formato.pdf",
    mimeType: overrides.mimeType ?? "application/pdf",
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
