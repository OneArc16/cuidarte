export function parseCsvRows(csvContent: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let isInsideQuotes = false;

  for (let index = 0; index < csvContent.length; index += 1) {
    const character = csvContent[index];
    const nextCharacter = csvContent[index + 1];

    if (character === '"') {
      if (isInsideQuotes && nextCharacter === '"') {
        currentCell += '"';
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

  if (isInsideQuotes) {
    throw new Error("El archivo CSV contiene una comilla sin cerrar.");
  }

  if (currentCell !== "" || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export function normalizeHeader(value: string): string {
  return normalizeText(value)
    .replaceAll(/[^\p{L}\p{N}]+/gu, "_")
    .replaceAll(/^_+|_+$/g, "");
}

export function findHeaderIndex(headerRow: string[], candidates: string[]): number {
  return headerRow.findIndex((column) => candidates.includes(column));
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
