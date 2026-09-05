import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { assertEpsCatalogIntegrity } from "./eps-catalog-integrity";
import { normalizeEpsName } from "./eps-reference-data";
import { epsCatalog } from "./schema";

export const EPS_DEMO_RECORD = {
  code: "EPS001",
  nit: "N830113831",
  name: "COLMEDICA EPS - ALIANSALUD DESDE EL 01/01/2011",
  nameNormalized: normalizeEpsName("COLMEDICA EPS - ALIANSALUD DESDE EL 01/01/2011"),
};

export async function seedEpsDemo(): Promise<void> {
  const client = postgres(getEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  try {
    await db.transaction(async (transaction) => {
      const existingRecords = await transaction
        .select({
          code: epsCatalog.code,
          nit: epsCatalog.nit,
          name: epsCatalog.name,
          nameNormalized: epsCatalog.nameNormalized,
        })
        .from(epsCatalog);

      assertEpsCatalogIntegrity(existingRecords, [EPS_DEMO_RECORD]);

      await transaction
        .insert(epsCatalog)
        .values({
          ...EPS_DEMO_RECORD,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: epsCatalog.code,
          set: {
            name: EPS_DEMO_RECORD.name,
            nameNormalized: EPS_DEMO_RECORD.nameNormalized,
            isActive: true,
            updatedAt: new Date(),
          },
        });
    });

    console.log(`EPS demo ${EPS_DEMO_RECORD.code} sincronizada correctamente.`);
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  void seedEpsDemo().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible sincronizar la EPS demo: ${message}`);
    process.exitCode = 1;
  });
}
