import path from "node:path";

import { BadRequestException } from "@nestjs/common";

import { type BufferedAtencionIndividualUpload } from "./atencion-individual.types";

export const MAX_ATENCION_SUPPORT_FILES = 3;
export const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_REQUEST_SIZE_BYTES = MAX_ATENCION_SUPPORT_FILES * MAX_PDF_FILE_SIZE_BYTES;

const PDF_MIME_TYPE = "application/pdf";
const PDF_SIGNATURE = Buffer.from("%PDF-");
const MAX_PDF_HEADER_OFFSET = 1024;

export function validatePdfSupportUpload(
  upload: BufferedAtencionIndividualUpload,
): BufferedAtencionIndividualUpload {
  const originalName = normalizeOriginalName(upload.originalName);

  if (upload.mimeType.trim().toLowerCase() !== PDF_MIME_TYPE) {
    throw new BadRequestException("Cada soporte debe declararse como un archivo PDF.");
  }

  if (path.extname(originalName).toLowerCase() !== ".pdf") {
    throw new BadRequestException("Cada soporte debe tener extension .pdf.");
  }

  if (upload.sizeBytes !== upload.buffer.byteLength || upload.sizeBytes === 0) {
    throw new BadRequestException("El archivo PDF es invalido.");
  }

  if (upload.sizeBytes > MAX_PDF_FILE_SIZE_BYTES) {
    throw new BadRequestException("Cada PDF puede pesar maximo 10 MB.");
  }

  if (!hasPdfSignature(upload.buffer)) {
    throw new BadRequestException("El contenido del archivo no corresponde a un PDF valido.");
  }

  return {
    ...upload,
    originalName,
    mimeType: PDF_MIME_TYPE,
  };
}

function normalizeOriginalName(value: string): string {
  const basename = path.posix.basename(value.trim().replaceAll("\\", "/"));
  const normalized = basename.replace(/[\u0000-\u001F\u007F]/g, "").trim();

  if (normalized.length === 0 || normalized.length > 260) {
    throw new BadRequestException("El nombre original del archivo es invalido.");
  }

  return normalized;
}

function hasPdfSignature(buffer: Buffer): boolean {
  return buffer.subarray(0, MAX_PDF_HEADER_OFFSET).indexOf(PDF_SIGNATURE) !== -1;
}
