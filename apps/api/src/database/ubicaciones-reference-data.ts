import { createHash } from "node:crypto";

import {
  findHeaderIndex,
  normalizeHeader,
  normalizeText,
  parseCsvRows,
} from "./reference-data/csv";

const DANE_DIVIPOLA_DOWNLOAD_URL = "https://www.datos.gov.co/api/views/gdxc-w37w/rows.csv?accessType=DOWNLOAD";

const SUPPORTED_MUNICIPALITY_TYPES = new Set(["municipio", "isla"]);

export const UBICACIONES_REFERENCE_DATA = {
  dataset: "divipola_catalog",
  version: "2024-12-30",
  source: "https://www.datos.gov.co/d/gdxc-w37w",
  downloadUrl: DANE_DIVIPOLA_DOWNLOAD_URL,
} as const;

export type UbicacionesReferenceDepartment = {
  code: string;
  name: string;
};

export type UbicacionesReferenceMunicipality = {
  code: string;
  departmentCode: string;
  name: string;
};

export type UbicacionesReferenceData = {
  checksumSha256: string;
  sourceRowCount: number;
  departments: UbicacionesReferenceDepartment[];
  municipalities: UbicacionesReferenceMunicipality[];
};

export async function loadUbicacionesReferenceData(
  fetchImpl: typeof fetch = fetch,
): Promise<UbicacionesReferenceData> {
  const response = await fetchImpl(UBICACIONES_REFERENCE_DATA.downloadUrl);

  if (!response.ok) {
    throw new Error(
      `No fue posible descargar DIVIPOLA: ${response.status} ${response.statusText}`.trim(),
    );
  }

  const csvContent = await response.text();

  return parseUbicacionesCsv(csvContent);
}

export function parseUbicacionesCsv(csvContent: string): UbicacionesReferenceData {
  const checksumSha256 = createHash("sha256").update(csvContent).digest("hex");
  const rows = parseCsvRows(csvContent);

  if (rows.length < 2) {
    throw new Error("El archivo DIVIPOLA no contiene datos.");
  }

  const headerRow = rows[0]?.map(normalizeHeader) ?? [];
  const departmentCodeIndex = findHeaderIndex(headerRow, [
    "cod_dpto",
    "codigo_departamento",
    "cod_departamento",
  ]);
  const departmentNameIndex = findHeaderIndex(headerRow, [
    "dpto",
    "departamento",
    "nom_dpto",
    "nombre_departamento",
  ]);
  const municipalityCodeIndex = findHeaderIndex(headerRow, [
    "cod_mpio",
    "codigo_municipio",
    "cod_mun",
  ]);
  const municipalityNameIndex = findHeaderIndex(headerRow, [
    "nom_mpio",
    "municipio",
    "nom_municipio",
    "nombre_municipio",
  ]);
  const municipalityTypeIndex = findHeaderIndex(headerRow, [
    "tipo_municipio",
    "tipo_municipio_isla_area_no_municipalizada",
  ]);

  if (
    departmentCodeIndex === -1 ||
    departmentNameIndex === -1 ||
    municipalityCodeIndex === -1 ||
    municipalityNameIndex === -1 ||
    municipalityTypeIndex === -1
  ) {
    throw new Error(
      "No fue posible identificar las columnas necesarias de DIVIPOLA (departamento, municipio y tipo).",
    );
  }

  const departments = new Map<string, UbicacionesReferenceDepartment>();
  const municipalities = new Map<string, UbicacionesReferenceMunicipality>();
  let sourceRowCount = 0;

  for (const [rowOffset, row] of rows.slice(1).entries()) {
    if (row.every((column) => column.trim() === "")) {
      continue;
    }

    sourceRowCount += 1;
    const rowNumber = rowOffset + 2;
    const departmentCode = normalizeDivipolaCode(row[departmentCodeIndex] ?? "", 2);
    const departmentName = normalizeLocationName(row[departmentNameIndex] ?? "");
    const municipalityCode = normalizeDivipolaCode(row[municipalityCodeIndex] ?? "", 5);
    const municipalityName = normalizeLocationName(row[municipalityNameIndex] ?? "");
    const municipalityType = normalizeText(row[municipalityTypeIndex] ?? "");

    if (departmentCode === "" || departmentName === "") {
      throw new Error(`Departamento invalido en la fila ${rowNumber}.`);
    }

    const existingDepartment = departments.get(departmentCode);

    if (existingDepartment === undefined) {
      departments.set(departmentCode, {
        code: departmentCode,
        name: departmentName,
      });
    } else if (!sameLocationName(existingDepartment.name, departmentName)) {
      throw new Error(`Departamento duplicado con nombre distinto en la fila ${rowNumber}: ${departmentCode}.`);
    }

    if (!SUPPORTED_MUNICIPALITY_TYPES.has(municipalityType)) {
      continue;
    }

    if (municipalityCode === "" || municipalityName === "") {
      throw new Error(`Municipio invalido en la fila ${rowNumber}.`);
    }

    if (municipalities.has(municipalityCode)) {
      throw new Error(`Municipio duplicado en la fila ${rowNumber}: ${municipalityCode}.`);
    }

    municipalities.set(municipalityCode, {
      code: municipalityCode,
      departmentCode,
      name: municipalityName,
    });
  }

  if (departments.size === 0 || municipalities.size === 0) {
    throw new Error("El archivo DIVIPOLA no contiene registros utilizables.");
  }

  return {
    checksumSha256,
    sourceRowCount,
    departments: [...departments.values()].sort((left, right) => left.code.localeCompare(right.code)),
    municipalities: [...municipalities.values()].sort((left, right) =>
      left.code.localeCompare(right.code),
    ),
  };
}

function normalizeDivipolaCode(value: string, length: number): string {
  const compactValue = value.replaceAll(/\D/g, "").trim();

  if (compactValue === "") {
    return "";
  }

  return compactValue.padStart(length, "0").slice(-length);
}

function normalizeLocationName(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function sameLocationName(left: string, right: string): boolean {
  return normalizeText(left) === normalizeText(right);
}
