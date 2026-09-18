import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const apiDirectory = resolve(scriptDirectory, "..");
const drizzleDirectory = join(apiDirectory, "drizzle");
const journalPath = join(drizzleDirectory, "meta", "_journal.json");
const databaseName = `cuidarte_team_acta_verify_${process.pid}_${Date.now()}`;
const configuredUrl =
  process.env.DATABASE_URL ?? "postgres://cuidarte:cuidarte_dev_password@localhost:15432/cuidarte";
const verificationDatabaseUrl = withDatabaseName(configuredUrl, databaseName);
const adminDatabaseUrl = withDatabaseName(configuredUrl, "postgres");

const HEALTH_EXPECTED = [
  ["00000000-0000-4000-8000-000000000001", "SALUD-001", "medico", 1],
  ["00000000-0000-4000-8000-000000000002", "SALUD-002", "medico", 2],
  ["00000000-0000-4000-8000-000000000003", "SALUD-003", "medico", 3],
  ["00000000-0000-4000-8000-000000000004", "SALUD-004", "medico", 4],
  ["00000000-0000-4000-8000-000000000005", "SALUD-005", "medico", 5],
  ["00000000-0000-4000-8000-000000000006", "SALUD-006", "medico", 6],
  ["00000000-0000-4000-8000-000000000007", "SALUD-007", "medico", 7],
];

const PSYCHOSOCIAL_EXPECTED = [
  ["00000000-0000-4000-8000-000000000011", "PSICO-001", "psicologa", 1],
  ["00000000-0000-4000-8000-000000000012", "PSICO-002", "psicologa", 2],
];

const DELETED_EXPECTED = [
  ["00000000-0000-4000-8000-000000000101", "ENFER-004", "enfermeria", 4],
  ["00000000-0000-4000-8000-000000000102", "TSOC-007", "trabajadora_social", 7],
];

const databaseOptions = { max: 1, onnotice: () => undefined };
const admin = postgres(adminDatabaseUrl, databaseOptions);
let verificationDatabase;
let databaseCreated = false;

try {
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  verificationDatabase = postgres(verificationDatabaseUrl, databaseOptions);

  await applyMigrationsThrough0045(verificationDatabase);
  console.log("✓ Esquema temporal inicializado con las migraciones 0000 a 0045.");

  const fixture = await seedVerificationData(verificationDatabase);
  const deletedBefore = await selectActivities(verificationDatabase, DELETED_EXPECTED.map(([id]) => id));
  assert.deepEqual(deletedBefore, DELETED_EXPECTED);
  console.log("✓ Estado inicial: ENFER-004 y TSOC-007 eliminadas conservan sus valores históricos.");

  await applyMigration(verificationDatabase, "0046_actividades_grupales_shared_team_acta_series");
  await applyMigration(verificationDatabase, "0047_actividades_grupales_legacy_team_acta_prefixes");
  await applyMigration(verificationDatabase, "0048_actividades_grupales_active_team_acta_sequences");
  console.log("✓ Cadena 0046 -> 0047 -> 0048 ejecutada sin errores.");

  const deletedAfter = await selectActivities(verificationDatabase, DELETED_EXPECTED.map(([id]) => id));
  assert.deepEqual(deletedAfter, DELETED_EXPECTED);
  console.log("✓ Eliminadas preservadas: ENFER-004/enfermeria/4 y TSOC-007/trabajadora_social/7.");

  const healthAfter = await selectActivities(verificationDatabase, HEALTH_EXPECTED.map(([id]) => id));
  assert.deepEqual(healthAfter, HEALTH_EXPECTED);
  console.log("✓ Activas legacy ENFER/MED normalizadas a SALUD-001 hasta SALUD-007 en orden cronológico.");

  const psychosocialAfter = await selectActivities(
    verificationDatabase,
    PSYCHOSOCIAL_EXPECTED.map(([id]) => id),
  );
  assert.deepEqual(psychosocialAfter, PSYCHOSOCIAL_EXPECTED);
  console.log("✓ Activas legacy PSICO/TSOC normalizadas a PSICO-001 y PSICO-002.");

  const counters = await verificationDatabase`
    SELECT "organizer", "last_value" AS "lastValue"
    FROM "actividad_grupal_acta_organizer_counters"
    WHERE "tenant_id" = ${fixture.tenantId}
      AND "organizer" IN ('medico', 'enfermeria', 'psicologa', 'trabajadora_social')
    ORDER BY "organizer" ASC
  `;
  assert.deepEqual([...counters], [
    { organizer: "medico", lastValue: 7 },
    { organizer: "psicologa", lastValue: 2 },
  ]);
  console.log("✓ Contadores finales calculados solo desde activas: medico=7, psicologa=2.");

  const indexes = await verificationDatabase`
    SELECT
      index_class.relname AS "name",
      pg_get_expr(index_definition.indpred, index_definition.indrelid) AS "predicate"
    FROM pg_index AS index_definition
    INNER JOIN pg_class AS index_class ON index_class.oid = index_definition.indexrelid
    INNER JOIN pg_namespace AS index_namespace ON index_namespace.oid = index_class.relnamespace
    WHERE index_namespace.nspname = 'public'
      AND index_class.relname IN (
        'actividades_grupales_tenant_acta_unique',
        'actividades_grupales_tenant_acta_series_unique'
      )
    ORDER BY index_class.relname ASC
  `;
  assert.equal(indexes.length, 2);
  for (const index of indexes) {
    assert.match(index.predicate, /deleted_at\"? IS NULL/i);
  }
  console.log("✓ Índices unique finales son parciales con deleted_at IS NULL.");

  console.log("\nVerificación aislada completada correctamente.");
} finally {
  await verificationDatabase?.end({ timeout: 5 });
  if (databaseCreated) {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    console.log(`✓ Base temporal eliminada: ${databaseName}`);
  }
  await admin.end({ timeout: 5 });
}

function withDatabaseName(databaseUrl, name) {
  const url = new URL(databaseUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

async function applyMigrationsThrough0045(database) {
  const journal = JSON.parse(await readFile(journalPath, "utf8"));
  const migrations = journal.entries.filter((entry) => entry.idx <= 45);

  for (const migration of migrations) {
    await applyMigration(database, migration.tag);
  }
}

async function applyMigration(database, tag) {
  const migration = await readFile(join(drizzleDirectory, `${tag}.sql`), "utf8");
  const statements = migration
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await database.unsafe(statement);
  }
}

async function seedVerificationData(database) {
  const [tenant] = await database`
    INSERT INTO "tenants" ("document_type", "name", "is_active")
    VALUES ('nit', 'Verificación de series por equipo', true)
    RETURNING "id"
  `;
  const [user] = await database`
    INSERT INTO "users" ("tenant_id", "email", "full_name", "role", "password_hash")
    VALUES (${tenant.id}, 'verificacion-series@example.test', 'Usuario de verificación', 'admin', 'hash')
    RETURNING "id"
  `;
  const [activityType] = await database`
    INSERT INTO "actividad_grupal_tipos" ("tenant_id", "name", "normalized_name")
    VALUES (${tenant.id}, 'Tipo de verificación', 'tipo de verificacion')
    RETURNING "id"
  `;

  for (const activity of createVerificationActivities()) {
    await database`
      INSERT INTO "actividades_grupales" (
        "id",
        "tenant_id",
        "acta_number",
        "acta_organizer",
        "acta_sequence",
        "activity_name",
        "activity_type_id",
        "activity_date",
        "start_time",
        "end_time",
        "organizer",
        "created_by_user_id",
        "deleted_at",
        "deleted_by_user_id",
        "deletion_reason",
        "created_at",
        "updated_at"
      )
      VALUES (
        ${activity.id},
        ${tenant.id},
        ${activity.actaNumber},
        ${activity.actaOrganizer},
        ${activity.actaSequence},
        ${activity.name},
        ${activityType.id},
        ${activity.activityDate},
        ${activity.startTime},
        ${activity.endTime},
        ${activity.organizer},
        ${user.id},
        ${activity.deletedAt},
        ${activity.deletedAt === null ? null : user.id},
        ${activity.deletedAt === null ? null : 'Eliminada para verificación'},
        ${activity.createdAt},
        ${activity.createdAt}
      )
    `;
  }

  await database`
    INSERT INTO "actividad_grupal_acta_organizer_counters" (
      "tenant_id",
      "organizer",
      "last_value"
    )
    VALUES
      (${tenant.id}, 'medico', 99),
      (${tenant.id}, 'enfermeria', 4),
      (${tenant.id}, 'psicologa', 88),
      (${tenant.id}, 'trabajadora_social', 7)
  `;

  return { tenantId: tenant.id };
}

function createVerificationActivities() {
  return [
    activity({
      id: "00000000-0000-4000-8000-000000000001",
      actaNumber: "MED-100",
      actaOrganizer: "director",
      actaSequence: 100,
      activityDate: "2026-02-01",
      startTime: "09:00",
      endTime: "09:30",
      organizer: "director",
      createdAt: "2026-01-01T10:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000002",
      actaNumber: "ENFER-101",
      actaOrganizer: "director",
      actaSequence: 101,
      activityDate: "2026-02-01",
      startTime: "10:00",
      endTime: "10:30",
      organizer: "director",
      createdAt: "2026-01-01T10:05:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000003",
      actaNumber: "MED-102",
      actaOrganizer: "director",
      actaSequence: 102,
      activityDate: "2026-02-01",
      startTime: "10:00",
      endTime: "11:00",
      organizer: "director",
      createdAt: "2026-01-01T09:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000004",
      actaNumber: "ENFER-103",
      actaOrganizer: "director",
      actaSequence: 103,
      activityDate: "2026-02-02",
      startTime: "10:00",
      endTime: "11:00",
      organizer: "director",
      createdAt: "2026-01-01T08:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000005",
      actaNumber: "MED-104",
      actaOrganizer: "director",
      actaSequence: 104,
      activityDate: "2026-02-02",
      startTime: "10:00",
      endTime: "11:00",
      organizer: "director",
      createdAt: "2026-01-01T09:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000006",
      actaNumber: "ENFER-105",
      actaOrganizer: "enfermeria",
      actaSequence: 105,
      activityDate: "2026-02-03",
      startTime: "10:00",
      endTime: "11:00",
      organizer: "enfermeria",
      createdAt: "2026-01-01T09:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000007",
      actaNumber: "MED-106",
      actaOrganizer: "medico",
      actaSequence: 106,
      activityDate: "2026-02-03",
      startTime: "10:00",
      endTime: "11:00",
      organizer: "medico",
      createdAt: "2026-01-01T09:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000011",
      actaNumber: "PSICO-010",
      actaOrganizer: "director",
      actaSequence: 10,
      activityDate: "2026-01-31",
      startTime: "13:00",
      endTime: "14:00",
      organizer: "director",
      createdAt: "2026-01-01T10:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000012",
      actaNumber: "TSOC-011",
      actaOrganizer: "director",
      actaSequence: 11,
      activityDate: "2026-02-01",
      startTime: "13:00",
      endTime: "14:00",
      organizer: "director",
      createdAt: "2026-01-01T10:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000101",
      actaNumber: "ENFER-004",
      actaOrganizer: "enfermeria",
      actaSequence: 4,
      activityDate: "2025-01-01",
      startTime: "08:00",
      endTime: "09:00",
      organizer: "enfermeria",
      createdAt: "2025-01-01T08:00:00.000Z",
      deletedAt: "2025-01-02T08:00:00.000Z",
    }),
    activity({
      id: "00000000-0000-4000-8000-000000000102",
      actaNumber: "TSOC-007",
      actaOrganizer: "trabajadora_social",
      actaSequence: 7,
      activityDate: "2025-01-02",
      startTime: "08:00",
      endTime: "09:00",
      organizer: "trabajadora_social",
      createdAt: "2025-01-02T08:00:00.000Z",
      deletedAt: "2025-01-03T08:00:00.000Z",
    }),
  ];
}

function activity({
  id,
  actaNumber,
  actaOrganizer,
  actaSequence,
  activityDate,
  startTime,
  endTime,
  organizer,
  createdAt,
  deletedAt = null,
}) {
  return {
    id,
    actaNumber,
    actaOrganizer,
    actaSequence,
    name: `Actividad ${id.slice(-3)}`,
    activityDate,
    startTime,
    endTime,
    organizer,
    createdAt: new Date(createdAt),
    deletedAt: deletedAt === null ? null : new Date(deletedAt),
  };
}

async function selectActivities(database, ids) {
  const rows = await database`
    SELECT
      "id",
      "acta_number" AS "actaNumber",
      "acta_organizer" AS "actaOrganizer",
      "acta_sequence" AS "actaSequence"
    FROM "actividades_grupales"
    WHERE "id" = ANY(${ids}::uuid[])
    ORDER BY "id" ASC
  `;

  return rows.map((row) => [row.id, row.actaNumber, row.actaOrganizer, row.actaSequence]);
}
