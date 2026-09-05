import { count, eq, inArray, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { departments, municipalities, referenceDataVersions } from "./schema";
import { UBICACIONES_REFERENCE_DATA, loadUbicacionesReferenceData } from "./ubicaciones-reference-data";

const CHUNK_SIZE = 500;

export async function seedUbicaciones(): Promise<void> {
  const referenceData = await loadUbicacionesReferenceData();
  const client = postgres(getEnv().DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  try {
    await db.transaction(async (transaction) => {
      const departmentCodes = referenceData.departments.map((department) => department.code);
      const municipalityCodes = referenceData.municipalities.map((municipality) => municipality.code);

      for (let index = 0; index < referenceData.departments.length; index += CHUNK_SIZE) {
        const chunk = referenceData.departments.slice(index, index + CHUNK_SIZE);
        const now = new Date();

        await transaction
          .insert(departments)
          .values(
            chunk.map((department) => ({
              code: department.code,
              name: department.name,
              isActive: true,
            })),
          )
          .onConflictDoUpdate({
            target: departments.code,
            set: {
              name: sql`excluded.name`,
              isActive: true,
              updatedAt: now,
            },
          });
      }

      const departmentRows = await transaction
        .select({
          id: departments.id,
          code: departments.code,
        })
        .from(departments)
        .where(inArray(departments.code, departmentCodes));

      if (departmentRows.length !== departmentCodes.length) {
        throw new Error(
          `No fue posible resolver todos los departamentos sincronizados: se esperaban ${departmentCodes.length} y se obtuvieron ${departmentRows.length}.`,
        );
      }

      const departmentIdByCode = new Map(departmentRows.map((row) => [row.code, row.id]));

      for (let index = 0; index < referenceData.municipalities.length; index += CHUNK_SIZE) {
        const chunk = referenceData.municipalities.slice(index, index + CHUNK_SIZE);
        const now = new Date();

        await transaction
          .insert(municipalities)
          .values(
            chunk.map((municipality) => {
              const departmentId = departmentIdByCode.get(municipality.departmentCode);

              if (departmentId === undefined) {
                throw new Error(
                  `No fue posible resolver el departamento ${municipality.departmentCode} para el municipio ${municipality.code}.`,
                );
              }

              return {
                code: municipality.code,
                departmentId,
                name: municipality.name,
                isActive: true,
              };
            }),
          )
          .onConflictDoUpdate({
            target: municipalities.code,
            set: {
              departmentId: sql`excluded.department_id`,
              name: sql`excluded.name`,
              isActive: true,
              updatedAt: now,
            },
          });
      }

      await transaction
        .update(departments)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(notInArray(departments.code, departmentCodes));

      await transaction
        .update(municipalities)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(notInArray(municipalities.code, municipalityCodes));

      const [activeDepartmentsState] = await transaction
        .select({ activeRecords: count() })
        .from(departments)
        .where(eq(departments.isActive, true));

      if (activeDepartmentsState?.activeRecords !== referenceData.departments.length) {
        throw new Error(
          `Validacion DIVIPOLA de departamentos fallida: se esperaban ${referenceData.departments.length} registros activos y se encontraron ${activeDepartmentsState?.activeRecords ?? 0}.`,
        );
      }

      const [activeMunicipalitiesState] = await transaction
        .select({ activeRecords: count() })
        .from(municipalities)
        .where(eq(municipalities.isActive, true));

      if (activeMunicipalitiesState?.activeRecords !== referenceData.municipalities.length) {
        throw new Error(
          `Validacion DIVIPOLA de municipios fallida: se esperaban ${referenceData.municipalities.length} registros activos y se encontraron ${activeMunicipalitiesState?.activeRecords ?? 0}.`,
        );
      }

      await transaction
        .insert(referenceDataVersions)
        .values({
          dataset: UBICACIONES_REFERENCE_DATA.dataset,
          version: UBICACIONES_REFERENCE_DATA.version,
          checksumSha256: referenceData.checksumSha256,
          rowCount: referenceData.sourceRowCount,
          source: UBICACIONES_REFERENCE_DATA.source,
        })
        .onConflictDoUpdate({
          target: referenceDataVersions.dataset,
          set: {
            version: UBICACIONES_REFERENCE_DATA.version,
            checksumSha256: referenceData.checksumSha256,
            rowCount: referenceData.sourceRowCount,
            source: UBICACIONES_REFERENCE_DATA.source,
            appliedAt: new Date(),
          },
        });
    });

    console.log(
      `DIVIPOLA ${UBICACIONES_REFERENCE_DATA.version} sincronizado: ${referenceData.departments.length} departamentos y ${referenceData.municipalities.length} municipios activos.`,
    );
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  void seedUbicaciones().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No fue posible sincronizar DIVIPOLA: ${message}`);
    process.exitCode = 1;
  });
}
