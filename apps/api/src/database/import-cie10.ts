import { seedCie10 } from "./seed-cie10";

void seedCie10().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No fue posible sincronizar el catalogo CIE-10: ${message}`);
  process.exitCode = 1;
});
