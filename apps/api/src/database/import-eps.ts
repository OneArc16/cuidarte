import { basename } from "node:path";

import { seedEps } from "./seed-eps";

const filePath = process.env.EPS_REFERENCE_DATA_FILE?.trim();
const version = process.env.EPS_REFERENCE_DATA_VERSION?.trim();

if (filePath === undefined || filePath === "") {
  console.error("Define EPS_REFERENCE_DATA_FILE con la ruta del archivo Excel.");
  process.exitCode = 1;
} else {
  void seedEps(
    filePath,
    version === undefined || version === "" ? basename(filePath) : version,
  ).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible sincronizar el catalogo EPS: ${message}`);
    process.exitCode = 1;
  });
}
