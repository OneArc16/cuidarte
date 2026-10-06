import { readFile } from "node:fs/promises";
import path from "node:path";

const MEMBRETE_RELATIVE_PATH = path.join("public", "logos", "membrete.png");

let cachedMembreteDataUrl: string | null | undefined;

/** Returns the official letterhead inline for Playwright PDF templates. */
export async function getPdfLetterheadDataUrl(): Promise<string | null> {
  if (cachedMembreteDataUrl !== undefined) {
    return cachedMembreteDataUrl;
  }

  for (const candidatePath of [
    path.resolve(process.cwd(), "apps", "web", MEMBRETE_RELATIVE_PATH),
    path.resolve(process.cwd(), "..", "web", MEMBRETE_RELATIVE_PATH),
  ]) {
    try {
      const buffer = await readFile(candidatePath);
      cachedMembreteDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      return cachedMembreteDataUrl;
    } catch {
      continue;
    }
  }

  cachedMembreteDataUrl = null;
  return cachedMembreteDataUrl;
}
