import path from "node:path";

import { BadRequestException } from "@nestjs/common";

import { type BufferedAlimentacionFormatoPdfUpload } from "./alimentacion.types";

export const MAX_ALIMENTACION_FORMATO_PDF_SIZE_BYTES = 10 * 1024 * 1024;

const PDF_MIME_TYPE = "application/pdf";
const PDF_SIGNATURE = Buffer.from("%PDF-");

export function validateAlimentacionImportedFormatoPdf(
  upload: BufferedAlimentacionFormatoPdfUpload,
): BufferedAlimentacionFormatoPdfUpload & { mimeType: "application/pdf" } {
  const originalName = normalizeOriginalName(upload.originalName);

  if (upload.mimeType.trim().toLowerCase() !== PDF_MIME_TYPE) {
    throw new BadRequestException("El archivo debe declararse como un PDF.");
  }

  if (path.extname(originalName).toLowerCase() !== ".pdf") {
    throw new BadRequestException("El archivo debe tener extension .pdf.");
  }

  if (upload.sizeBytes !== upload.buffer.byteLength || upload.sizeBytes === 0) {
    throw new BadRequestException("El archivo PDF esta vacio o es invalido.");
  }

  if (upload.sizeBytes > MAX_ALIMENTACION_FORMATO_PDF_SIZE_BYTES) {
    throw new BadRequestException("El archivo PDF puede pesar maximo 10 MiB.");
  }

  if (!upload.buffer.subarray(0, PDF_SIGNATURE.byteLength).equals(PDF_SIGNATURE)) {
    throw new BadRequestException("El contenido del archivo no corresponde a un PDF valido.");
  }

  return {
    ...upload,
    originalName,
    mimeType: PDF_MIME_TYPE,
  };
}

function normalizeOriginalName(value: string): string {
  const originalName = value.trim();

  if (
    originalName.length === 0 ||
    originalName.length > 260 ||
    originalName === "." ||
    originalName === ".." ||
    originalName.includes("/") ||
    originalName.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(originalName)
  ) {
    throw new BadRequestException("El nombre del archivo es invalido.");
  }

  return originalName;
}
