import { seedUbicaciones } from "./seed-ubicaciones";

void seedUbicaciones().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No fue posible sincronizar DIVIPOLA: ${message}`);
  process.exitCode = 1;
});
