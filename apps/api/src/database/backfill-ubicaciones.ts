import { eq, isNull, or } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import * as schema from "./schema";
import { adultosMayores, departments, municipalities, tenants } from "./schema";

type ReferenceDataDatabase = PostgresJsDatabase<typeof schema>;

type LocationCatalog = {
  departments: Array<{ id: string; name: string }>;
  municipalities: Array<{ id: string; departmentId: string; name: string }>;
};

type LocationCatalogIndex = {
  departmentIdByName: Map<string, string>;
  municipalityIdByDepartmentAndName: Map<string, string>;
};

type ResolvedLocation = {
  departmentId: string;
  municipalityId: string;
};

type BackfillResult = {
  updated: number;
  unresolved: Array<{ id: string; department: string | null; municipality: string | null }>;
};

export function resolveLegacyLocation(
  catalog: LocationCatalog,
  departmentName: string | null,
  municipalityName: string | null,
): ResolvedLocation | null {
  return resolveLegacyLocationFromIndex(
    createLocationCatalogIndex(catalog),
    departmentName,
    municipalityName,
  );
}

function createLocationCatalogIndex(catalog: LocationCatalog): LocationCatalogIndex {
  return {
    departmentIdByName: new Map(
      catalog.departments.map((department) => [
        normalizeLegacyLocationName(department.name),
        department.id,
      ]),
    ),
    municipalityIdByDepartmentAndName: new Map(
      catalog.municipalities.map((municipality) => [
        createMunicipalityLookupKey(municipality.departmentId, municipality.name),
        municipality.id,
      ]),
    ),
  };
}

function resolveLegacyLocationFromIndex(
  catalogIndex: LocationCatalogIndex,
  departmentName: string | null,
  municipalityName: string | null,
): ResolvedLocation | null {
  if (departmentName === null || municipalityName === null) {
    return null;
  }

  const departmentId = catalogIndex.departmentIdByName.get(
    normalizeLegacyLocationName(departmentName),
  );

  if (departmentId === undefined) {
    return null;
  }

  const municipalityId = catalogIndex.municipalityIdByDepartmentAndName.get(
    createMunicipalityLookupKey(departmentId, municipalityName),
  );

  return municipalityId === undefined
    ? null
    : {
        departmentId,
        municipalityId,
      };
}

export async function backfillUbicaciones(): Promise<void> {
  const client = postgres(getEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db: ReferenceDataDatabase = drizzle(client, { schema });

  try {
    const [activeDepartments, activeMunicipalities] = await Promise.all([
      db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.isActive, true)),
      db
        .select({
          id: municipalities.id,
          departmentId: municipalities.departmentId,
          name: municipalities.name,
        })
        .from(municipalities)
        .where(eq(municipalities.isActive, true)),
    ]);
    const catalog: LocationCatalog = {
      departments: activeDepartments,
      municipalities: activeMunicipalities,
    };

    const tenantResult = await backfillTenants(db, catalog);
    const adultoMayorResult = await backfillAdultosMayores(db, catalog);

    printBackfillResult("tenants", tenantResult);
    printBackfillResult("adultos_mayores", adultoMayorResult);
  } finally {
    await client.end({ timeout: 5 });
  }
}

async function backfillTenants(
  db: ReferenceDataDatabase,
  catalog: LocationCatalog,
): Promise<BackfillResult> {
  const legacyRows = await db
    .select({
      id: tenants.id,
      department: tenants.department,
      municipality: tenants.city,
    })
    .from(tenants)
    .where(or(isNull(tenants.departmentId), isNull(tenants.municipalityId)));

  return backfillLegacyRows(legacyRows, catalog, async (row, location) => {
    await db
      .update(tenants)
      .set({
        departmentId: location.departmentId,
        municipalityId: location.municipalityId,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, row.id));
  });
}

async function backfillAdultosMayores(
  db: ReferenceDataDatabase,
  catalog: LocationCatalog,
): Promise<BackfillResult> {
  const legacyRows = await db
    .select({
      id: adultosMayores.id,
      department: adultosMayores.department,
      municipality: adultosMayores.municipality,
    })
    .from(adultosMayores)
    .where(or(isNull(adultosMayores.departmentId), isNull(adultosMayores.municipalityId)));

  return backfillLegacyRows(legacyRows, catalog, async (row, location) => {
    await db
      .update(adultosMayores)
      .set({
        departmentId: location.departmentId,
        municipalityId: location.municipalityId,
        updatedAt: new Date(),
      })
      .where(eq(adultosMayores.id, row.id));
  });
}

async function backfillLegacyRows(
  rows: Array<{ id: string; department: string | null; municipality: string | null }>,
  catalog: LocationCatalog,
  update: (row: { id: string }, location: ResolvedLocation) => Promise<void>,
): Promise<BackfillResult> {
  const unresolved: BackfillResult["unresolved"] = [];
  const catalogIndex = createLocationCatalogIndex(catalog);
  let updated = 0;

  for (const row of rows) {
    const location = resolveLegacyLocationFromIndex(catalogIndex, row.department, row.municipality);

    if (location === null) {
      unresolved.push(row);
      continue;
    }

    await update(row, location);
    updated += 1;
  }

  return { updated, unresolved };
}

function printBackfillResult(entity: string, result: BackfillResult): void {
  console.log(`Backfill de ubicaciones para ${entity}: ${result.updated} registros actualizados.`);

  if (result.unresolved.length > 0) {
    console.warn(
      `Backfill de ubicaciones para ${entity}: ${result.unresolved.length} registros sin correspondencia exacta.`,
    );
    console.warn(
      result.unresolved
        .map(
          (row) =>
            `${row.id}: ${row.department ?? "(sin departamento)"} / ${row.municipality ?? "(sin municipio)"}`,
        )
        .join("\n"),
    );
  }
}

function normalizeLegacyLocationName(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
    .replaceAll(/\bD\s+C\b/gu, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function createMunicipalityLookupKey(departmentId: string, municipalityName: string): string {
  return `${departmentId}:${normalizeLegacyLocationName(municipalityName)}`;
}

if (require.main === module) {
  void backfillUbicaciones().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible completar el backfill de ubicaciones: ${message}`);
    process.exitCode = 1;
  });
}
