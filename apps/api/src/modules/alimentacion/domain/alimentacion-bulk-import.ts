import { createHash } from "node:crypto";

import { BadRequestException } from "@nestjs/common";
import { type AlimentacionBulkImportMode } from "@cuidarte/contracts";

import { validateAlimentacionImportedFormatoPdf } from "./alimentacion-imported-formato-pdf";
import { type BufferedAlimentacionFormatoPdfUpload } from "./alimentacion.types";

const BULK_FILENAME_PATTERN = /^([A-Za-z0-9._-]+?)[_-](\d{4})[_-](0[1-9]|1[0-2])\.pdf$/i;
export const BULK_IMPORT_MAX_FILES = 100;
export const BULK_IMPORT_MAX_TOTAL_BYTES = 100 * 1024 * 1024;
export const BULK_IMPORT_EXPIRY_MINUTES = 30;

export type ParsedBulkFilename = {
  documentNumber: string;
  normalizedDocumentNumber: string;
  deliveryMonth: string;
};

export function parseBulkImportFilename(filename: string): ParsedBulkFilename {
  const safeName = filename.split(/[\\/]/).pop()?.trim() ?? "";
  const match = BULK_FILENAME_PATTERN.exec(safeName);
  if (match === null) {
    throw new BulkImportValidationError(
      "INVALID_FILENAME",
      "El nombre debe tener el formato numero-identificacion-YYYY-MM.pdf o numero_identificacion_YYYY_MM.pdf.",
    );
  }

  return {
    documentNumber: match[1]!,
    normalizedDocumentNumber: normalizeBulkDocumentNumber(match[1]!),
    deliveryMonth: `${match[2]}-${match[3]}`,
  };
}

export function validateBulkImportUpload(upload: BufferedAlimentacionFormatoPdfUpload) {
  return validateAlimentacionImportedFormatoPdf(upload);
}

export function hashBulkImportUpload(upload: BufferedAlimentacionFormatoPdfUpload): string {
  return createHash("sha256").update(upload.buffer).digest("hex");
}

export function normalizeBulkDocumentNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export function assertBulkImportModeMonth(
  mode: AlimentacionBulkImportMode,
  requestedMonth: string | null,
  filenameMonth: string,
): void {
  if (mode === "month" && requestedMonth !== filenameMonth) {
    throw new BulkImportValidationError(
      "INVALID_MONTH",
      `El archivo corresponde a ${filenameMonth} y el lote solicita ${requestedMonth ?? "un mes"}.`,
    );
  }
}

export class BulkImportValidationError extends BadRequestException {
  constructor(
    public readonly reasonCode: "INVALID_FILENAME" | "INVALID_MONTH" | "INVALID_PDF",
    message: string,
  ) {
    super(message);
  }
}
