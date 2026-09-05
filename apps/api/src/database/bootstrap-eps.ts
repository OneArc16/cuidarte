import { basename } from "node:path";

import { backfillEps } from "./backfill-eps";
import { seedBundledEps, seedEps } from "./seed-eps";

const filePath = process.env.EPS_REFERENCE_DATA_FILE?.trim();
const configuredVersion = process.env.EPS_REFERENCE_DATA_VERSION?.trim();

if (filePath === undefined || filePath === "") {
  void seedBundledEps()
    .then(() => backfillEps({ write: true }))
    .catch(handleBootstrapError);
} else {
  const version =
    configuredVersion === undefined || configuredVersion === ""
      ? basename(filePath)
      : configuredVersion;

  void seedEps(filePath, version)
    .then(() => backfillEps({ write: true }))
    .catch(handleBootstrapError);
}

function handleBootstrapError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No fue posible preparar el catalogo EPS: ${message}`);
  process.exitCode = 1;
}
