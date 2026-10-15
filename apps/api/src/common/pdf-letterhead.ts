import { readFile } from "node:fs/promises";
import path from "node:path";

const MEMBRETE_RELATIVE_PATH = path.join("public", "logos", "membrete.png");

let cachedMembreteDataUrl: string | null | undefined;

/** Returns the official letterhead inline for Playwright PDF templates. */
export async function getPdfLetterheadDataUrl(): Promise<string | null> {
  if (cachedMembreteDataUrl !== undefined) {
    return cachedMembreteDataUrl;
  }

  for (const candidatePath of getMembreteCandidatePaths()) {
    try {
      const buffer = await readFile(candidatePath);
      if (buffer.length === 0) {
        continue;
      }
      cachedMembreteDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      return cachedMembreteDataUrl;
    } catch {
      continue;
    }
  }

  cachedMembreteDataUrl = null;
  return cachedMembreteDataUrl;
}

/**
 * Resolves the official letterhead for formats where it is mandatory.
 * Historical PDFs are read from storage and do not call this function.
 */
export async function getRequiredPdfLetterheadDataUrl(): Promise<string> {
  const membreteDataUrl = await getPdfLetterheadDataUrl();

  if (membreteDataUrl === null) {
    throw new Error(
      "No fue posible leer el membrete obligatorio del formato de alimentacion. Verifica apps/web/public/logos/membrete.png.",
    );
  }

  return membreteDataUrl;
}

function getMembreteCandidatePaths(): string[] {
  return [
    path.resolve(process.cwd(), "apps", "web", MEMBRETE_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", MEMBRETE_RELATIVE_PATH),
  ];
}
