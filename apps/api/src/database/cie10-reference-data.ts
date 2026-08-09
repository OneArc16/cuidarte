import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  findHeaderIndex,
  normalizeHeader,
  normalizeText,
  parseCsvRows,
} from "./reference-data/csv";

export const CIE10_REFERENCE_DATA = {
  dataset: "cie10_catalog",
  version: "1",
  fileName: "cie10-catalog-v1.csv",
  checksumSha256: "c67fcfe9f8afd93a337837cb3401d8edf0455435ae754695c47a95ce3a80fcc8",
  rowCount: 12_634,
  source:
    "https://huggingface.co/datasets/dmartingarcia/cie-10/resolve/main/cie10-es-diagnoses.csv",
} as const;

export type Cie10ReferenceRecord = {
  code: string;
  title: string;
  titleNormalized: string;
};

export async function loadCie10ReferenceData(): Promise<Cie10ReferenceRecord[]> {
  const filePath = join(__dirname, "reference-data", CIE10_REFERENCE_DATA.fileName);
  const fileContent = await readFile(filePath);
  const checksum = createHash("sha256").update(fileContent).digest("hex");

  if (checksum !== CIE10_REFERENCE_DATA.checksumSha256) {
    throw new Error(
      `Checksum CIE-10 invalido: se esperaba ${CIE10_REFERENCE_DATA.checksumSha256} y se obtuvo ${checksum}.`,
    );
  }

  const records = parseCie10Csv(fileContent.toString("utf8"));

  if (records.length !== CIE10_REFERENCE_DATA.rowCount) {
    throw new Error(
      `Cantidad CIE-10 invalida: se esperaban ${CIE10_REFERENCE_DATA.rowCount} registros y se obtuvieron ${records.length}.`,
    );
  }

  return records;
}

export function parseCie10Csv(csvContent: string): Cie10ReferenceRecord[] {
  const rows = parseCsvRows(csvContent);

  if (rows.length < 2) {
    throw new Error("El archivo CIE-10 no contiene datos.");
  }

  const headerRow = rows[0]?.map(normalizeHeader) ?? [];
  const codeIndex = findHeaderIndex(headerRow, ["code", "codigo", "cie10", "cie_10", "cod"]);
  const titleIndex = findHeaderIndex(headerRow, [
    "title",
    "titulo",
    "name",
    "nombre",
    "description",
    "descripcion",
    "diagnosis",
    "diagnostico",
  ]);

  if (codeIndex === -1 || titleIndex === -1) {
    throw new Error("No fue posible identificar las columnas de codigo y descripcion del CIE-10.");
  }

  const records: Cie10ReferenceRecord[] = [];
  const codes = new Set<string>();

  for (const [rowOffset, row] of rows.slice(1).entries()) {
    if (row.every((column) => column.trim() === "")) {
      continue;
    }

    const rowNumber = rowOffset + 2;
    const code = normalizeCode(row[codeIndex] ?? "");
    const title = normalizeTitle(row[titleIndex] ?? "");

    if (!isValidCie10Code(code)) {
      throw new Error(`Codigo CIE-10 invalido en la fila ${rowNumber}: ${code || "(vacio)"}.`);
    }

    if (title === "" || title.length > 255) {
      throw new Error(`Descripcion CIE-10 invalida en la fila ${rowNumber}.`);
    }

    if (codes.has(code)) {
      throw new Error(`Codigo CIE-10 duplicado en la fila ${rowNumber}: ${code}.`);
    }

    codes.add(code);
    records.push({
      code,
      title,
      titleNormalized: normalizeText(title),
    });
  }

  return records;
}

function normalizeCode(value: string): string {
  const compactCode = value.trim().toUpperCase().replaceAll(".", "");

  if (compactCode.length <= 3) {
    return compactCode;
  }

  return `${compactCode.slice(0, 3)}.${compactCode.slice(3)}`;
}

function normalizeTitle(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function isValidCie10Code(value: string): boolean {
  return /^[A-Z][0-9][0-9AB](\.[0-9A-Z]{1,2})?$/.test(value);
}
