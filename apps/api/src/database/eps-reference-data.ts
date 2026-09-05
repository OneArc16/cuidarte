import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import ExcelJS from "exceljs";

import { findHeaderIndex, normalizeHeader, parseCsvRows } from "./reference-data/csv";

export const EPS_REFERENCE_DATASET = "eps";
export const BUNDLED_EPS_REFERENCE_DATA = {
  source: "reference-data/eps.csv",
  version: "2026-08-08",
} as const;

export type EpsReferenceRecord = {
  code: string;
  nit: string;
  name: string;
  nameNormalized: string;
};

export type EpsReferenceData = {
  checksumSha256: string;
  sourceRowCount: number;
  records: EpsReferenceRecord[];
};

export async function loadEpsReferenceData(filePath: string): Promise<EpsReferenceData> {
  const fileContent = await readFile(filePath);
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(Uint8Array.from(fileContent).buffer);

  const worksheet = workbook.worksheets[0];

  if (worksheet === undefined) {
    throw new Error("El archivo de EPS no contiene hojas.");
  }

  const rows: string[][] = [];

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];

    for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex += 1) {
      values.push(row.getCell(columnIndex).text);
    }

    rows.push(values);
  });

  return parseEpsRows(rows, createHash("sha256").update(fileContent).digest("hex"));
}

export async function loadBundledEpsReferenceData(): Promise<EpsReferenceData> {
  const fileContent = await readFile(join(__dirname, "reference-data", "eps.csv"));

  return parseEpsRows(
    parseCsvRows(fileContent.toString("utf8")),
    createHash("sha256").update(fileContent).digest("hex"),
  );
}

export function parseEpsRows(
  rows: readonly (readonly string[])[],
  checksumSha256 = createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
): EpsReferenceData {
  if (rows.length < 2) {
    throw new Error("El archivo de EPS no contiene datos.");
  }

  const headerRow = (rows[0] ?? []).map(normalizeHeader);
  const codeIndex = findHeaderIndex(headerRow, ["codigo", "code", "codigo_eps"]);
  const nitIndex = findHeaderIndex(headerRow, ["nit", "numero_nit", "nit_correcto"]);
  const nameIndex = findHeaderIndex(headerRow, ["nombre", "name", "nombre_eps", "razon_social"]);

  if (codeIndex === -1 || nitIndex === -1 || nameIndex === -1) {
    throw new Error("El archivo de EPS debe contener las columnas codigo, nit y nombre.");
  }

  const records: EpsReferenceRecord[] = [];
  const rowByCode = new Map<string, number>();
  const rowByName = new Map<string, number>();
  let sourceRowCount = 0;

  for (const [rowOffset, row] of rows.slice(1).entries()) {
    if (row.every((column) => column.trim() === "")) {
      continue;
    }

    sourceRowCount += 1;
    const rowNumber = rowOffset + 2;
    const code = normalizeEpsCode(row[codeIndex] ?? "");
    const nit = normalizeEpsNit(row[nitIndex] ?? "");
    const name = normalizeEpsDisplayName(row[nameIndex] ?? "");
    const nameNormalized = normalizeEpsName(name);

    if (code === "" || code.length > 40) {
      throw new Error(`Codigo de EPS invalido en la fila ${rowNumber}.`);
    }

    if (nit === "" || nit.length > 20 || !/^[A-Z0-9]+$/.test(nit)) {
      throw new Error(`NIT de EPS invalido en la fila ${rowNumber}.`);
    }

    if (name === "" || name.length > 160) {
      throw new Error(`Nombre de EPS invalido en la fila ${rowNumber}.`);
    }

    assertUniqueValue("codigo", code, rowNumber, rowByCode);
    assertUniqueValue("nombre", nameNormalized, rowNumber, rowByName);

    records.push({ code, nit, name, nameNormalized });
  }

  if (records.length === 0) {
    throw new Error("El archivo de EPS no contiene registros utilizables.");
  }

  return {
    checksumSha256,
    sourceRowCount,
    records: records.toSorted((left, right) => left.code.localeCompare(right.code)),
  };
}

export function normalizeEpsName(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CO")
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function normalizeEpsCode(value: string): string {
  return value.replaceAll(/\s+/g, "").trim().toLocaleUpperCase("es-CO");
}

export function normalizeEpsNit(value: string): string {
  return value
    .replaceAll(/[.\s-]+/g, "")
    .trim()
    .toLocaleUpperCase("es-CO");
}

function normalizeEpsDisplayName(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function assertUniqueValue(
  field: string,
  value: string,
  rowNumber: number,
  rowsByValue: Map<string, number>,
): void {
  const existingRow = rowsByValue.get(value);

  if (existingRow !== undefined) {
    throw new Error(
      `Valor duplicado de ${field} en las filas ${existingRow} y ${rowNumber}: ${value}.`,
    );
  }

  rowsByValue.set(value, rowNumber);
}
