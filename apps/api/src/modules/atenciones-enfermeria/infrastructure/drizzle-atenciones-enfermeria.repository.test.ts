import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AtencionEnfermeriaNotFoundError,
  AtencionEnfermeriaPermissionDeniedError,
  AtencionEnfermeriaVersionConflictError,
} from "../domain/atenciones-enfermeria.repository";
import { DrizzleAtencionesEnfermeriaRepository } from "./drizzle-atenciones-enfermeria.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const nurseUserId = "11111111-1111-4111-8111-111111111111";
const otherNurseUserId = "22222222-2222-4222-8222-222222222222";
const recordId = "33333333-3333-4333-8333-333333333333";

describe("DrizzleAtencionesEnfermeriaRepository", () => {
  it("lists records without additional round trips", async () => {
    const { repository, state } = createRepositoryStub([[createListRow()]]);

    const records = await repository.findMany({
      scope: { type: "tenant", tenantId },
      search: null,
      tenantId: null,
      adultoMayorId: null,
      documentNumber: null,
      professionalUserId: null,
      attentionDate: null,
    });

    assert.equal(records.length, 1);
    assert.equal(records[0]!.adultoMayor.fullName, "Alfonso Gomez Prieto");
    assert.equal(records[0]!.professional.role, "enfermeria");
    assert.equal(state.selectCalls, 1);
    assert.equal(state.transactionCalls, 0);
  });

  it("returns a detail record by id within the scoped tenant", async () => {
    const { repository, state } = createRepositoryStub([[createDetailRow()]]);

    const record = await repository.findById({
      id: recordId,
      scope: { type: "tenant", tenantId },
    });

    assert.equal(record?.id, recordId);
    assert.equal(record?.nursingNote, "Paciente estable.");
    assert.equal(state.selectCalls, 1);
  });

  it("creates an attention transactionally and stores a redacted audit entry", async () => {
    const { repository, state } = createRepositoryStub([
      [createAdultLookupRow()],
      [createNurseLookupRow()],
      [createDetailRow()],
    ]);

    const created = await repository.create({
      id: recordId,
      tenantId,
      adultoMayorId,
      actorUserId: nurseUserId,
      attentionDate: "2026-08-16",
      attentionTime: "08:30",
      careType: "control_signos_vitales",
      reason: "Control inicial",
      tensionSistolica: 120,
      tensionDiastolica: 80,
      frecuenciaCardiaca: 72,
      frecuenciaRespiratoria: 18,
      temperatura: 36.4,
      saturacionOxigeno: 97,
      pesoKg: 62.3,
      tallaCm: 165,
      perimetroAbdominalCm: 88.5,
      glucometriaMgDl: 95,
      glucometriaContext: "ayunas",
      nursingNote: "Paciente estable.",
    });

    assert.equal(created.id, recordId);
    assert.equal(created.attentionTime, "08:30");
    assert.equal(state.transactionCalls, 1);
    assert.equal(state.insertValues.length, 1);
    const inserted = state.insertValues[0]! as Record<string, any>;
    assert.equal(inserted.imc, 22.9);
    assert.equal(inserted.version, 1);
    assert.equal(inserted.createdByUserId, nurseUserId);
    const audit = state.auditValues[0]! as Record<string, any>;
    assert.equal(audit.action, "atenciones-enfermeria.created");
    assert.equal(audit.metadata.nursingNote, undefined);
    assert.deepEqual(audit.metadata.changedFields.includes("nursingNote"), true);
  });

  it("rejects updates from another nurse and keeps the record untouched", async () => {
    const { repository, state } = createRepositoryStub([
      [createDetailRow({ createdByUserId: nurseUserId })],
    ]);

    await assert.rejects(
      repository.update({
        id: recordId,
        tenantId,
        actorUserId: otherNurseUserId,
        version: 1,
        attentionDate: "2026-08-16",
        attentionTime: "08:45",
        careType: "seguimiento",
        reason: "Cambio",
        tensionSistolica: 118,
        tensionDiastolica: 78,
        frecuenciaCardiaca: 70,
        frecuenciaRespiratoria: 18,
        temperatura: 36.5,
        saturacionOxigeno: 98,
        pesoKg: 63,
        tallaCm: 165,
        perimetroAbdominalCm: 88.5,
        glucometriaMgDl: 90,
        glucometriaContext: "ayunas",
        nursingNote: "Otra nota.",
      }),
      AtencionEnfermeriaPermissionDeniedError,
    );

    assert.equal(state.updateCalls, 0);
    assert.equal(state.auditValues.length, 0);
  });

  it("raises a version conflict when the expected version has changed", async () => {
    const { repository, state } = createRepositoryStub([
      [createDetailRow({ createdByUserId: nurseUserId })],
    ]);
    state.updateResults.push([]);

    await assert.rejects(
      repository.update({
        id: recordId,
        tenantId,
        actorUserId: nurseUserId,
        version: 1,
        attentionDate: "2026-08-16",
        attentionTime: "08:45",
        careType: "seguimiento",
        reason: "Cambio",
        tensionSistolica: 118,
        tensionDiastolica: 78,
        frecuenciaCardiaca: 70,
        frecuenciaRespiratoria: 18,
        temperatura: 36.5,
        saturacionOxigeno: 98,
        pesoKg: 63,
        tallaCm: 165,
        perimetroAbdominalCm: 88.5,
        glucometriaMgDl: 90,
        glucometriaContext: "ayunas",
        nursingNote: "Otra nota.",
      }),
      AtencionEnfermeriaVersionConflictError,
    );

    assert.equal(state.auditValues.length, 0);
  });

  it("returns null when the scoped adult does not belong to the tenant", async () => {
    const { repository } = createRepositoryStub([]);

    const adult = await repository.findAdultoMayorScopeById({
      adultoMayorId,
      scope: { type: "tenant", tenantId },
    });

    assert.equal(adult, null);
  });
});

function createRepositoryStub(selectResults: Array<Array<Record<string, unknown>>>) {
  const state = {
    transactionCalls: 0,
    selectCalls: 0,
    insertValues: [] as Array<Record<string, unknown>>,
    auditValues: [] as Array<Record<string, unknown>>,
    updateValues: [] as Array<Record<string, unknown>>,
    updateCalls: 0,
    updateResults: [] as Array<Array<Record<string, unknown>>>,
  };

  const selectQueue = [...selectResults];

  function createAwaitable<T>(value: T) {
    return {
      then(onFulfilled: (resolved: T) => unknown) {
        return Promise.resolve(value).then(onFulfilled);
      },
    };
  }

  function createQueryChain() {
    const chain = {
      from() {
        return chain;
      },
      innerJoin() {
        return chain;
      },
      leftJoin() {
        return chain;
      },
      where() {
        return chain;
      },
      orderBy() {
        return chain;
      },
      limit() {
        state.selectCalls += 1;
        return createAwaitable(selectQueue.shift() ?? []);
      },
      offset() {
        return chain;
      },
      then(onFulfilled: (resolved: Array<Record<string, unknown>>) => unknown) {
        state.selectCalls += 1;
        return Promise.resolve(selectQueue.shift() ?? []).then(onFulfilled);
      },
    };

    return chain;
  }

  const tx = {
    select() {
      return createQueryChain();
    },
    insert() {
      return {
        values(value: Record<string, unknown>) {
          if ("action" in value) {
            state.auditValues.push(value);
          } else {
            state.insertValues.push(value);
          }

          return {
            returning() {
              return createAwaitable([{ id: recordId }]);
            },
            then(onFulfilled: (resolved: undefined) => unknown) {
              return Promise.resolve(undefined).then(onFulfilled);
            },
          };
        },
      };
    },
    update() {
      return {
        set(value: Record<string, unknown>) {
          state.updateValues.push(value);

          return {
            where() {
              state.updateCalls += 1;

              return {
                returning() {
                  return createAwaitable(state.updateResults.shift() ?? [{ id: recordId }]);
                },
              };
            },
          };
        },
      };
    },
  };

  const repository = new DrizzleAtencionesEnfermeriaRepository({
    db: {
      ...tx,
      async transaction<T>(callback: (transaction: typeof tx) => Promise<T>) {
        state.transactionCalls += 1;
        return await callback(tx);
      },
    },
  } as never);

  return { repository, state };
}

function createAdultLookupRow() {
  return {
    id: adultoMayorId,
    tenantId,
    tenantName: "Centro de Vida Demo",
    documentNumber: "71234567",
    names: "Alfonso",
    surnames: "Gomez Prieto",
    birthDate: "1948-05-10",
    sex: "male",
    eps: null,
    healthRegime: null,
  };
}

function createNurseLookupRow() {
  return {
    id: nurseUserId,
    tenantId,
    role: "enfermeria" as const,
    isActive: true,
  };
}

function createListRow(overrides: Record<string, unknown> = {}) {
  return {
    id: recordId,
    tenantId,
    tenantName: "Centro de Vida Demo",
    adultoMayorId,
    adultoDocumentNumber: "71234567",
    adultoNames: "Alfonso",
    adultoSurnames: "Gomez Prieto",
    adultoBirthDate: "1948-05-10",
    adultoSex: "male",
    adultoEps: null,
    adultoHealthRegime: null,
    attentionDate: "2026-08-16",
    attentionTime: "08:30",
    careType: "control_signos_vitales" as const,
    reason: "Control inicial",
    tensionSistolica: 120,
    tensionDiastolica: 80,
    frecuenciaCardiaca: 72,
    frecuenciaRespiratoria: 18,
    temperatura: 36.4,
    saturacionOxigeno: 97,
    pesoKg: 62.3,
    tallaCm: 165,
    imc: 22.9,
    perimetroAbdominalCm: 88.5,
    glucometriaMgDl: 95,
    glucometriaContext: "ayunas" as const,
    createdByUserId: nurseUserId,
    updatedByUserId: nurseUserId,
    version: 1,
    createdAt: new Date("2026-08-16T13:00:00.000Z"),
    updatedAt: new Date("2026-08-16T13:00:00.000Z"),
    professionalUserId: nurseUserId,
    professionalFullName: "Enfermera Centro",
    professionalRole: "enfermeria" as const,
    ...overrides,
  };
}

function createDetailRow(overrides: Record<string, unknown> = {}) {
  return {
    ...createListRow(overrides),
    nursingNote: "Paciente estable.",
  };
}
