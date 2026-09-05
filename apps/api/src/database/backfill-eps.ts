import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { normalizeEpsName } from "./eps-reference-data";
import * as schema from "./schema";
import { adultosMayores, epsCatalog } from "./schema";

type ReferenceDataDatabase = PostgresJsDatabase<typeof schema>;

export type LegacyEpsResolution = {
  epsId: string;
  epsName: string;
};

export type EpsBackfillResult = {
  resolved: number;
  unresolved: Array<{ id: string; tenantId: string; eps: string }>;
};

export function resolveLegacyEps(
  catalog: readonly { id: string; name: string; nameNormalized: string }[],
  legacyName: string | null,
): LegacyEpsResolution | null {
  if (legacyName === null || legacyName.trim() === "") {
    return null;
  }

  const normalizedLegacyName = normalizeEpsName(legacyName);
  const match = catalog.find((record) => record.nameNormalized === normalizedLegacyName);

  return match === undefined ? null : { epsId: match.id, epsName: match.name };
}

export async function backfillEps(options: { write: boolean }): Promise<EpsBackfillResult> {
  const client = postgres(getEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db: ReferenceDataDatabase = drizzle(client, { schema });

  try {
    const [catalog, legacyRows] = await Promise.all([
      db
        .select({
          id: epsCatalog.id,
          name: epsCatalog.name,
          nameNormalized: epsCatalog.nameNormalized,
        })
        .from(epsCatalog),
      db
        .select({
          id: adultosMayores.id,
          tenantId: adultosMayores.tenantId,
          eps: adultosMayores.eps,
        })
        .from(adultosMayores)
        .where(
          and(
            isNull(adultosMayores.epsId),
            isNotNull(adultosMayores.eps),
            ne(adultosMayores.eps, ""),
          ),
        ),
    ]);
    const unresolved: EpsBackfillResult["unresolved"] = [];
    const resolvedRows: Array<{ id: string; epsId: string }> = [];

    for (const row of legacyRows) {
      if (row.eps === null) {
        continue;
      }

      const resolution = resolveLegacyEps(catalog, row.eps);

      if (resolution === null) {
        unresolved.push({ id: row.id, tenantId: row.tenantId, eps: row.eps });
        continue;
      }

      resolvedRows.push({ id: row.id, epsId: resolution.epsId });
    }

    if (options.write && resolvedRows.length > 0) {
      await db.transaction(async (transaction) => {
        for (const row of resolvedRows) {
          await transaction
            .update(adultosMayores)
            .set({ epsId: row.epsId, updatedAt: new Date() })
            .where(eq(adultosMayores.id, row.id));
        }
      });
    }

    const result = { resolved: resolvedRows.length, unresolved };
    printBackfillResult(result, options.write);

    return result;
  } finally {
    await client.end({ timeout: 5 });
  }
}

function printBackfillResult(result: EpsBackfillResult, write: boolean): void {
  const mode = write ? "escritura" : "reporte";
  console.log(`Backfill EPS (${mode}): ${result.resolved} registros con coincidencia exacta.`);

  if (result.unresolved.length > 0) {
    console.warn(`Backfill EPS: ${result.unresolved.length} registros sin correspondencia exacta.`);
    console.warn(
      result.unresolved.map((row) => `${row.id} | tenant ${row.tenantId} | ${row.eps}`).join("\n"),
    );
  }
}

if (require.main === module) {
  void backfillEps({ write: process.argv.includes("--write") }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible completar el backfill EPS: ${message}`);
    process.exitCode = 1;
  });
}
