import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { cie10Catalog } from "./schema";

const DEFAULT_CIE10_SOURCE_URL =
  process.env.CIE10_SOURCE_URL ??
  "https://huggingface.co/datasets/dmartingarcia/cie-10/resolve/main/cie10-es-diagnoses.csv?download=true";

async function importCie10(): Promise<void> {
  const env = getEnv();
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  try {
    const csvContent = await loadCsvContent();
    const records = parseCie10Csv(csvContent);

    if (records.length === 0) {
      throw new Error("No se encontraron diagnosticos CIE-10 validos en la fuente.");
    }

    await db.delete(cie10Catalog);

    const chunkSize = 500;
    for (let index = 0; index < records.length; index += chunkSize) {
      const chunk = records.slice(index, index + chunkSize);

      await db
        .insert(cie10Catalog)
        .values(
          chunk.map((record) => ({
            code: record.code,
            title: record.title,
            titleNormalized: normalizeText(record.title),
            isActive: true,
          })),
        )
        .onConflictDoUpdate({
          target: cie10Catalog.code,
          set: {
            title: sql`excluded.title`,
            titleNormalized: sql`excluded.title_normalized`,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    }

    // Preserve a consistent terminal message for scripting and manual runs.
    console.log(`CIE-10 importado: ${records.length} diagnosticos.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function loadCsvContent(): Promise<string> {
  const localPath = process.env.CIE10_SOURCE_FILE?.trim();

  if (localPath !== undefined && localPath !== "") {
    const { readFile } = await import("node:fs/promises");
    return await readFile(localPath, "utf8");
  }

  const response = await fetch(DEFAULT_CIE10_SOURCE_URL);

  if (!response.ok) {
    throw new Error(`No fue posible descargar el catalogo CIE-10. HTTP ${response.status}.`);
  }

  return await response.text();
}

function parseCie10Csv(csvContent: string): Array<{ code: string; title: string }> {
  const rows = parseCsvRows(csvContent);

  if (rows.length < 2) {
    return [];
  }

  const headerRow = rows[0]?.map((column) => normalizeHeader(column)) ?? [];
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
    throw new Error("No fue posible identificar las columnas de codigo y descripcion en el CSV CIE-10.");
  }

  return rows
    .slice(1)
    .map((row) => ({
      code: normalizeCode(row[codeIndex] ?? ""),
      title: normalizeTitle(row[titleIndex] ?? ""),
    }))
    .filter(
      (record, index, currentRecords) =>
        record.code !== "" &&
        record.title !== "" &&
        isLikelyCie10Code(record.code) &&
        currentRecords.findIndex((candidate) => candidate.code === record.code) === index,
    );
}

function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isInsideQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index];
    const nextCharacter = csvContent[index + 1];

    if (character === "\"") {
      if (isInsideQuotes && nextCharacter === "\"") {
        currentCell += "\"";
        index += 1;
      } else {
        isInsideQuotes = !isInsideQuotes;
      }
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !isInsideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += character;
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeHeader(value: string): string {
  return normalizeText(value).replaceAll(" ", "_");
}

function findHeaderIndex(headerRow: string[], candidates: string[]): number {
  return headerRow.findIndex((column) => candidates.includes(column));
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeTitle(value: string): string {
  return value.replaceAll(/\s+/g, " ").trim();
}

function isLikelyCie10Code(value: string): boolean {
  return /^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,2})?$/.test(value);
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

void importCie10();
