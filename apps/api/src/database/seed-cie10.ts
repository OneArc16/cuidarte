import { count, eq, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { CIE10_REFERENCE_DATA, loadCie10ReferenceData } from "./cie10-reference-data";
import { cie10Catalog, referenceDataVersions } from "./schema";

const CHUNK_SIZE = 500;

export async function seedCie10(): Promise<void> {
  const records = await loadCie10ReferenceData();
  const client = postgres(getEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  try {
    await db.transaction(async (transaction) => {
      for (let index = 0; index < records.length; index += CHUNK_SIZE) {
        const chunk = records.slice(index, index + CHUNK_SIZE);

        await transaction
          .insert(cie10Catalog)
          .values(
            chunk.map((record) => ({
              ...record,
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

      await transaction
        .update(cie10Catalog)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          notInArray(
            cie10Catalog.code,
            records.map((record) => record.code),
          ),
        );

      const [catalogState] = await transaction
        .select({ activeRecords: count() })
        .from(cie10Catalog)
        .where(eq(cie10Catalog.isActive, true));

      if (catalogState?.activeRecords !== records.length) {
        throw new Error(
          `Validacion CIE-10 fallida: se esperaban ${records.length} registros activos y se encontraron ${catalogState?.activeRecords ?? 0}.`,
        );
      }

      await transaction
        .insert(referenceDataVersions)
        .values({
          dataset: CIE10_REFERENCE_DATA.dataset,
          version: CIE10_REFERENCE_DATA.version,
          checksumSha256: CIE10_REFERENCE_DATA.checksumSha256,
          rowCount: records.length,
          source: CIE10_REFERENCE_DATA.source,
        })
        .onConflictDoUpdate({
          target: referenceDataVersions.dataset,
          set: {
            version: CIE10_REFERENCE_DATA.version,
            checksumSha256: CIE10_REFERENCE_DATA.checksumSha256,
            rowCount: records.length,
            source: CIE10_REFERENCE_DATA.source,
            appliedAt: new Date(),
          },
        });
    });

    console.log(
      `CIE-10 ${CIE10_REFERENCE_DATA.version} sincronizado: ${records.length} diagnosticos activos.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  void seedCie10().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible sincronizar el catalogo CIE-10: ${message}`);
    process.exitCode = 1;
  });
}
