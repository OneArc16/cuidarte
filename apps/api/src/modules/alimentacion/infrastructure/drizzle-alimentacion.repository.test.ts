import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DrizzleAlimentacionRepository } from "./drizzle-alimentacion.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const recordId = "1a3782f0-b999-412c-a0f4-31ed47cb8f3f";

describe("DrizzleAlimentacionRepository", () => {
  it("deletes a record inside a transaction and stores an audit snapshot", async () => {
    const row = createRecordRow();
    const { repository, state } = createRepositoryStub([row]);

    const deletedRecord = await repository.delete({
      id: recordId,
      actorUserId: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
      scope: { type: "tenant", tenantId },
    });

    assert.equal(deletedRecord?.id, recordId);
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.deleteCalls, 1);
    assert.deepEqual(state.auditInsert?.action, "alimentacion.deleted");
    assert.equal(state.auditInsert?.targetTenantId, tenantId);
    assert.equal(state.auditInsert?.metadata.record.id, recordId);
    assert.equal(state.auditInsert?.metadata.record.importedFormato, null);
  });

  it("returns null when the scoped record does not exist", async () => {
    const { repository, state } = createRepositoryStub([]);

    const deletedRecord = await repository.delete({
      id: recordId,
      actorUserId: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
      scope: { type: "tenant", tenantId },
    });

    assert.equal(deletedRecord, null);
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.deleteCalls, 0);
    assert.equal(state.auditInsert, null);
  });
});

function createRepositoryStub(rows: Array<ReturnType<typeof createRecordRow>>) {
  const state = {
    transactionCalls: 0,
    auditInsert: null as any,
    deleteCalls: 0,
  };

  const queryChain = {
    from() {
      return queryChain;
    },
    innerJoin() {
      return queryChain;
    },
    where() {
      return queryChain;
    },
    async limit() {
      return rows;
    },
  };

  const tx = {
    select() {
      return queryChain;
    },
    insert() {
      return {
        async values(value: Record<string, unknown>) {
          state.auditInsert = value;
        },
      };
    },
    delete() {
      return {
        async where() {
          state.deleteCalls += 1;
        },
      };
    },
  };

  const repository = new DrizzleAlimentacionRepository({
    db: {
      async transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
        state.transactionCalls += 1;

        return callback(tx);
      },
    },
  } as never);

  return { repository, state };
}

function createRecordRow() {
  return {
    id: recordId,
    tenantId,
    tenantName: "Centro de Vida Demo",
    adultoMayorId,
    documentNumber: "1020304050",
    names: "Rosa Elena",
    surnames: "Martinez Rojas",
    deliveryDate: "2026-04-24",
    organizer: "nutricionista" as const,
    refrigerio1: "entregado" as const,
    almuerzo: "entregado" as const,
    refrigerio2: "no_aplica" as const,
    auxilioTransporte: "no_entregado" as const,
    createdAt: new Date("2026-04-24T12:00:00.000Z"),
    updatedAt: new Date("2026-04-24T12:00:00.000Z"),
  };
}
