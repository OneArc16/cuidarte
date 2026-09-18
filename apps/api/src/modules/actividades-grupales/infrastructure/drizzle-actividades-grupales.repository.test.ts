import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ActaCorrectionPreviewRow } from "../domain/actividad-grupal.types";
import { ActaCorrectionConflictError } from "../domain/actividad-grupal.types";
import {
  assertCorrectionFinalStateIsUnique,
  buildCorrectionPreviewRows,
  buildTemporaryCorrectionRows,
  DrizzleActividadesGrupalesRepository,
  hashCorrectionSnapshot,
} from "./drizzle-actividades-grupales.repository";

type ActiveRow = {
  id: string;
  actaNumber: string;
  actaOrganizer: "psicologa" | "director";
  actaSequence: number;
};

describe("DrizzleActividadesGrupalesRepository correction planning", () => {
  it("normalizes health and psychosocial teams in their shared series", () => {
    const rows = [
      {
        ...correctionSource("health-001", "ENFER-010", 10, "2026-09-17"),
        organizer: "enfermeria" as const,
        actaOrganizer: "medico" as const,
      },
      {
        ...correctionSource("health-002", "MED-004", 4, "2026-09-18"),
        organizer: "medico" as const,
        actaOrganizer: "medico" as const,
      },
      {
        ...correctionSource("psico-001", "TSOC-008", 8, "2026-09-17"),
        organizer: "trabajadora_social" as const,
        actaOrganizer: "psicologa" as const,
      },
      correctionSource("psico-002", "PSICO-002", 2, "2026-09-18"),
    ];

    const preview = buildCorrectionPreviewRows(rows);

    assert.deepEqual(
      preview.map((row) => row.proposedActaNumber),
      ["SALUD-001", "SALUD-002", "PSICO-001", "PSICO-002"],
    );
  });

  it("assigns positive temporary sequences above the real maximum for the PSICO-024 chain", () => {
    const activeRows = [
      active("024", "PSICO-024", 24),
      active("026", "PSICO-026", 26),
      active("027", "PSICO-027", 27),
      active("028", "PSICO-028", 28),
      active("029", "PSICO-029", 29),
      active("030", "PSICO-030", 30),
    ];
    const targets = [
      target("026", "PSICO-024", 24),
      target("024", "PSICO-025", 25),
      target("027", "PSICO-026", 26),
      target("028", "PSICO-027", 27),
      target("029", "PSICO-028", 28),
      target("030", "PSICO-029", 29),
    ];

    assert.doesNotThrow(() => assertCorrectionFinalStateIsUnique(activeRows, targets));

    const temporaryRows = buildTemporaryCorrectionRows({
      operationId: "01234567-89ab-cdef-0123-456789abcdef",
      activeRows,
      changedRows: targets,
    });

    assert.deepEqual(
      temporaryRows.map((row) => row.temporaryActaSequence),
      [31, 32, 33, 34, 35, 36],
    );
    assert.equal(new Set(temporaryRows.map((row) => row.temporaryActaNumber)).size, 6);
    assert.ok(temporaryRows.every((row) => row.temporaryActaNumber.length <= 40));
  });

  it("plans a three-acta cycle without retaining an occupied final series", () => {
    const activeRows = [
      active("001", "PSICO-001", 1),
      active("002", "PSICO-002", 2),
      active("003", "PSICO-003", 3),
    ];
    const targets = [
      target("001", "PSICO-002", 2),
      target("002", "PSICO-003", 3),
      target("003", "PSICO-001", 1),
    ];

    assert.doesNotThrow(() => assertCorrectionFinalStateIsUnique(activeRows, targets));
    assert.deepEqual(
      buildTemporaryCorrectionRows({
        operationId: "01234567-89ab-cdef-0123-456789abcdef",
        activeRows,
        changedRows: targets,
      }).map((row) => row.temporaryActaSequence),
      [4, 5, 6],
    );
  });

  it("plans a middle-gap normalization and ignores deleted actas when finding the maximum", () => {
    const activeRows = [
      active("001", "PSICO-001", 1),
      active("002", "PSICO-002", 2),
      active("003", "PSICO-003", 3),
      active("005", "PSICO-005", 5),
    ];
    const targets = [target("005", "PSICO-004", 4)];

    assert.doesNotThrow(() => assertCorrectionFinalStateIsUnique(activeRows, targets));
    assert.deepEqual(
      buildTemporaryCorrectionRows({
        operationId: "01234567-89ab-cdef-0123-456789abcdef",
        activeRows,
        changedRows: targets,
      }).map((row) => row.temporaryActaSequence),
      [6],
    );
  });

  it("does not change temporary series for another organizer during a filtered normalization", () => {
    const activeRows = [
      active("psico-001", "PSICO-001", 1),
      active("psico-003", "PSICO-003", 3),
      active("director-001", "DIR-001", 1, "director"),
    ];
    const targets = [target("psico-003", "PSICO-002", 2)];

    const temporaryRows = buildTemporaryCorrectionRows({
      operationId: "01234567-89ab-cdef-0123-456789abcdef",
      activeRows,
      changedRows: targets,
    });

    assert.deepEqual(
      temporaryRows.map((row) => row.id),
      ["psico-003"],
    );
    assert.deepEqual(
      temporaryRows.map((row) => row.temporaryActaSequence),
      [4],
    );
  });

  it("rejects a final acta-number collision with an active acta outside the organizer filter", () => {
    const activeRows = [
      active("psico-003", "PSICO-003", 3),
      active("other-organizer", "PSICO-002", 9, "director"),
    ];

    assert.throws(
      () => assertCorrectionFinalStateIsUnique(activeRows, [target("psico-003", "PSICO-002", 2)]),
      ActaCorrectionConflictError,
    );
  });

  it("fails before writing temporary values when their positive sequence would overflow", () => {
    const activeRows = [active("max", "PSICO-2147483647", 2_147_483_647)];

    assert.throws(
      () =>
        buildTemporaryCorrectionRows({
          operationId: "01234567-89ab-cdef-0123-456789abcdef",
          activeRows,
          changedRows: [target("max", "PSICO-001", 1)],
        }),
      ActaCorrectionConflictError,
    );
  });

  it("keeps temporary values out of audit fields and records them only in the final phase", async () => {
    const { repository, state } = createApplyRepository();

    await repository.applyActaNumberCorrection({
      operationToken: state.operation.id,
      actorUserId: state.operation.requestedByUserId,
      reason: "Normalizacion de prueba",
    });

    const temporaryUpdates = state.activityUpdates.filter((update) =>
      String(update.actaNumber).startsWith("TMP-"),
    );
    const finalUpdates = state.activityUpdates.filter(
      (update) => !String(update.actaNumber).startsWith("TMP-"),
    );

    assert.equal(temporaryUpdates.length, 2);
    assert.ok(
      temporaryUpdates.every(
        (update) =>
          !("previousActaNumber" in update) &&
          !("actaNumberCorrectedAt" in update) &&
          !("actaNumberCorrectedByUserId" in update),
      ),
    );
    assert.equal(finalUpdates.length, 2);
    assert.ok(finalUpdates.every((update) => update.previousActaNumber !== undefined));
    assert.ok(finalUpdates.every((update) => update.actaNumberCorrectedAt instanceof Date));
    assert.ok(
      finalUpdates.every((update) => update.actaNumberCorrectedByUserId === state.actorUserId),
    );
  });

  it("rolls back phase one completely when a phase-two update fails", async () => {
    const { repository, state } = createApplyRepository({ failOnFinalUpdate: 2 });
    const originalRows = structuredClone(state.activities);

    await assert.rejects(
      repository.applyActaNumberCorrection({
        operationToken: state.operation.id,
        actorUserId: state.operation.requestedByUserId,
        reason: "Forzar rollback",
      }),
      /fallo simulado de fase 2/,
    );

    assert.deepEqual(state.activities, originalRows);
    assert.ok(state.activities.every((row) => !row.actaNumber.startsWith("TMP-")));
    assert.equal(Math.max(...state.activities.map((row) => row.actaSequence)), 26);
    assert.equal(state.operation.usedAt, null);
  });
});

function active(
  id: string,
  actaNumber: string,
  actaSequence: number,
  actaOrganizer: ActiveRow["actaOrganizer"] = "psicologa",
): ActiveRow {
  return { id, actaNumber, actaOrganizer, actaSequence };
}

function target(
  id: string,
  proposedActaNumber: string,
  sequence: number,
): ActaCorrectionPreviewRow {
  return {
    activityId: id,
    activityDate: "2026-09-17",
    startTime: "08:00",
    endTime: "09:00",
    organizer: "psicologa",
    currentActaNumber: `CURRENT-${id}`,
    proposedActaNumber,
    sequence,
    isDeleted: false,
  };
}

function createApplyRepository({ failOnFinalUpdate }: { failOnFinalUpdate?: number } = {}) {
  const actorUserId = "11111111-1111-4111-8111-111111111111";
  const operation = {
    id: "01234567-89ab-4def-8123-456789abcdef",
    tenantId: "22222222-2222-4222-8222-222222222222",
    requestedByUserId: actorUserId,
    organizer: "psicologa" as const,
    snapshotHash: "",
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    usedAt: null as Date | null,
  };
  const activities = [
    correctionSource("024", "PSICO-024", 24, "2026-09-18"),
    correctionSource("026", "PSICO-026", 26, "2026-09-17"),
  ];
  operation.snapshotHash = hashCorrectionSnapshot(activities as never);

  const state = {
    actorUserId,
    operation,
    activities,
    activityUpdates: [] as Array<Record<string, unknown>>,
  };
  const database = {
    db: {
      async transaction(callback: (tx: ReturnType<typeof createTransaction>) => Promise<unknown>) {
        const pendingActivities = structuredClone(state.activities);
        const pendingOperation = structuredClone(state.operation);
        const tx = createTransaction({
          state,
          activities: pendingActivities,
          operation: pendingOperation,
          failOnFinalUpdate,
        });

        const result = await callback(tx);
        state.activities.splice(0, state.activities.length, ...pendingActivities);
        Object.assign(state.operation, pendingOperation);
        return result;
      },
    },
  };

  return {
    repository: new DrizzleActividadesGrupalesRepository(database as never),
    state,
  };
}

function correctionSource(
  id: string,
  actaNumber: string,
  actaSequence: number,
  activityDate: string,
) {
  return {
    id,
    activityDate,
    startTime: "08:00",
    endTime: "09:00",
    organizer: "psicologa" as const,
    actaNumber,
    actaOrganizer: "psicologa" as const,
    actaSequence,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    deletedAt: null,
  };
}

function createTransaction({
  state,
  activities,
  operation,
  failOnFinalUpdate,
}: {
  state: {
    activityUpdates: Array<Record<string, unknown>>;
  };
  activities: Array<ReturnType<typeof correctionSource>>;
  operation: {
    id: string;
    tenantId: string;
    requestedByUserId: string;
    organizer: "psicologa";
    snapshotHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  };
  failOnFinalUpdate: number | undefined;
}) {
  const selectResults: unknown[][] = [[operation], [operation], activities, activities];
  let temporaryUpdateIndex = 0;
  let finalUpdateIndex = 0;

  const transaction = {
    select() {
      const chain = {
        from() {
          return chain;
        },
        where() {
          return chain;
        },
        orderBy() {
          return chain;
        },
        limit() {
          return Promise.resolve(selectResults.shift() ?? []);
        },
        then(onFulfilled: (result: unknown[]) => unknown) {
          return Promise.resolve(selectResults.shift() ?? []).then(onFulfilled);
        },
      };
      return chain;
    },
    execute() {
      return Promise.resolve();
    },
    update() {
      return {
        set(update: Record<string, unknown>) {
          return {
            async where() {
              if (typeof update.actaNumber === "string") {
                if (update.actaNumber.startsWith("TMP-")) {
                  Object.assign(activities[temporaryUpdateIndex]!, update);
                  temporaryUpdateIndex += 1;
                } else {
                  finalUpdateIndex += 1;
                  if (finalUpdateIndex === failOnFinalUpdate) {
                    throw new Error("fallo simulado de fase 2");
                  }
                  Object.assign(activities[finalUpdateIndex - 1]!, update);
                }
                state.activityUpdates.push(update);
              } else if ("usedAt" in update) {
                Object.assign(operation, update);
              }
            },
          };
        },
      };
    },
    insert() {
      return {
        values() {
          return {
            onConflictDoUpdate() {
              return Promise.resolve();
            },
            then(onFulfilled: () => unknown) {
              return Promise.resolve().then(onFulfilled);
            },
          };
        },
      };
    },
  };

  return transaction;
}
