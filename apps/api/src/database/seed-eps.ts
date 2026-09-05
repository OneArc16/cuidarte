import { basename } from "node:path";

import { count, eq, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { assertEpsCatalogIntegrity } from "./eps-catalog-integrity";
import {
  BUNDLED_EPS_REFERENCE_DATA,
  EPS_REFERENCE_DATASET,
  type EpsReferenceData,
  loadBundledEpsReferenceData,
  loadEpsReferenceData,
} from "./eps-reference-data";
import { epsCatalog, referenceDataVersions } from "./schema";

export async function seedEps(filePath: string, version: string): Promise<void> {
  return syncEpsReferenceData(await loadEpsReferenceData(filePath), {
    source: basename(filePath),
    version,
  });
}

export async function seedBundledEps(): Promise<void> {
  return syncEpsReferenceData(await loadBundledEpsReferenceData(), BUNDLED_EPS_REFERENCE_DATA);
}

async function syncEpsReferenceData(
  referenceData: EpsReferenceData,
  metadata: { source: string; version: string },
): Promise<void> {
  const { source, version } = metadata;

  if (version.trim() === "" || version.length > 50) {
    throw new Error("La version del catalogo EPS debe contener entre 1 y 50 caracteres.");
  }

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

      assertEpsCatalogIntegrity(existingRecords, referenceData.records);

      for (const record of referenceData.records) {
        await transaction
          .insert(epsCatalog)
          .values({
            ...record,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: epsCatalog.code,
            set: {
              nit: sql`excluded.nit`,
              name: sql`excluded.name`,
              nameNormalized: sql`excluded.name_normalized`,
              isActive: true,
              updatedAt: new Date(),
            },
          });
      }

      await transaction
        .update(epsCatalog)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(
          notInArray(
            epsCatalog.code,
            referenceData.records.map((record) => record.code),
          ),
        );

      const [catalogState] = await transaction
        .select({ activeRecords: count() })
        .from(epsCatalog)
        .where(eq(epsCatalog.isActive, true));

      if (catalogState?.activeRecords !== referenceData.records.length) {
        throw new Error(
          `Validacion EPS fallida: se esperaban ${referenceData.records.length} registros activos y se encontraron ${catalogState?.activeRecords ?? 0}.`,
        );
      }

      await transaction
        .insert(referenceDataVersions)
        .values({
          dataset: EPS_REFERENCE_DATASET,
          version,
          checksumSha256: referenceData.checksumSha256,
          rowCount: referenceData.sourceRowCount,
          source,
        })
        .onConflictDoUpdate({
          target: referenceDataVersions.dataset,
          set: {
            version,
            checksumSha256: referenceData.checksumSha256,
            rowCount: referenceData.sourceRowCount,
            source,
            appliedAt: new Date(),
          },
        });
    });

    console.log(
      `Catalogo EPS ${version} sincronizado: ${referenceData.records.length} registros activos.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  const filePath = process.env.EPS_REFERENCE_DATA_FILE?.trim();
  const version = process.env.EPS_REFERENCE_DATA_VERSION?.trim();

  if (filePath === undefined || filePath === "") {
    void seedBundledEps().catch(handleSeedError);
  } else {
    void seedEps(
      filePath,
      version === undefined || version === "" ? basename(filePath) : version,
    ).catch(handleSeedError);
  }
}

function handleSeedError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`No fue posible sincronizar el catalogo EPS: ${message}`);
  process.exitCode = 1;
}
