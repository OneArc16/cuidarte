import { type ReportType } from "@cuidarte/contracts";

const MAX_FILENAME_LENGTH = 180;

export function normalizeReportFilenamePart(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized === "" ? "SIN_DATO" : normalized;
}

export function buildAlimentacionReportPdfFilename(input: {
  documentNumber: string;
  names: string;
  surnames: string;
  period: string;
  importedVersion?: number;
}): string {
  const suffix =
    input.importedVersion === undefined ? "" : `_IMPORTADO_V${Math.max(1, input.importedVersion)}`;

  return limitPdfFilename(
    [
      "FORMATO_ENTREGA",
      normalizeReportFilenamePart(input.documentNumber),
      normalizeReportFilenamePart(input.surnames),
      normalizeReportFilenamePart(input.names),
      normalizeReportFilenamePart(input.period === "ALL" ? "TODOS" : input.period),
    ].join("_") + suffix,
  );
}

export function buildActaReportPdfFilename(input: {
  activityDate: string;
  actaNumber: string;
  descriptor: string;
}): string {
  return limitPdfFilename(
    [
      "ACTA_SESION_GRUPAL",
      normalizeReportFilenamePart(input.activityDate),
      normalizeReportFilenamePart(input.actaNumber),
      normalizeReportFilenamePart(input.descriptor),
    ].join("_"),
  );
}

export function buildReportZipFilename(input: {
  type: ReportType;
  tenantName: string;
  period: string;
}): string {
  const prefix =
    input.type === "FORMATOS_ENTREGA_ALIMENTACION"
      ? "FORMATOS_ENTREGA_ALIMENTACION"
      : "ACTAS_SESIONES_GRUPALES";

  return limitZipFilename(
    [
      prefix,
      normalizeReportFilenamePart(input.tenantName),
      normalizeReportFilenamePart(input.period === "ALL" ? "TODOS" : input.period),
    ].join("_"),
  );
}

export function deduplicateFilename(filename: string, usedFilenames: Set<string>): string {
  if (!usedFilenames.has(filename)) {
    usedFilenames.add(filename);
    return filename;
  }

  const extensionIndex = filename.toLowerCase().endsWith(".pdf")
    ? filename.length - 4
    : filename.length;
  const basename = filename.slice(0, extensionIndex);
  const extension = filename.slice(extensionIndex);

  for (let index = 2; index < 10_000; index += 1) {
    const candidate = `${basename}_${index}${extension}`;

    if (!usedFilenames.has(candidate)) {
      usedFilenames.add(candidate);
      return candidate;
    }
  }

  throw new Error("No fue posible generar un nombre unico para el archivo.");
}

function limitPdfFilename(basename: string): string {
  return `${basename.slice(0, MAX_FILENAME_LENGTH - 4).replace(/_+$/g, "")}.pdf`;
}

function limitZipFilename(basename: string): string {
  return `${basename.slice(0, MAX_FILENAME_LENGTH - 4).replace(/_+$/g, "")}.zip`;
}
