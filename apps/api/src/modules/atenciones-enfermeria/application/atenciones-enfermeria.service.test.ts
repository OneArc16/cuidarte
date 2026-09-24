import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { AtencionesEnfermeriaService } from "./atenciones-enfermeria.service";
import {
  AtencionEnfermeriaPermissionDeniedError,
  AtencionEnfermeriaVersionConflictError,
} from "../domain/atenciones-enfermeria.repository";
import { type AtencionesEnfermeriaRepository } from "../domain/atenciones-enfermeria.repository";
import {
  type AtencionEnfermeriaAdultoRecord,
  type AtencionEnfermeriaDetailRecord,
  type AtencionEnfermeriaHistoryItemRecord,
  type AtencionEnfermeriaListItemRecord,
  type FindAtencionEnfermeriaByIdQuery,
  type FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
  type FindAtencionEnfermeriaListQuery,
  type CreateAtencionEnfermeriaRecordCommand,
  type UpdateAtencionEnfermeriaRecordCommand,
} from "../domain/atencion-enfermeria.types";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const nurseUserId = "11111111-1111-4111-8111-111111111111";
const otherNurseUserId = "22222222-2222-4222-8222-222222222222";
const adminUserId = "33333333-3333-4333-8333-333333333333";
const recordId = "44444444-4444-4444-8444-444444444444";

const nurseUser: AuthUser = {
  id: nurseUserId,
  tenantId,
  email: "enfermera@centro.test",
  fullName: "Enfermera Centro",
  role: "enfermeria",
  passwordSetByAdmin: true,
};

const adminUser: AuthUser = {
  id: adminUserId,
  tenantId,
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: true,
};

const medicUser: AuthUser = {
  id: "55555555-5555-4555-8555-555555555555",
  tenantId,
  email: "medico@centro.test",
  fullName: "Medico Centro",
  role: "medico",
  passwordSetByAdmin: true,
};

const adultoRecord: AtencionEnfermeriaAdultoRecord = {
  id: adultoMayorId,
  tenantId,
  tenantName: "Centro Demo",
  documentNumber: "1020304050",
  fullName: "Rosa Elena Martinez Rojas",
  birthDate: "1948-03-12",
  sex: "female",
  eps: "Salud Demo",
  healthRegime: "subsidized",
};

const detailRecord: AtencionEnfermeriaDetailRecord = {
  id: recordId,
  tenantId,
  tenantName: adultoRecord.tenantName,
  adultoMayorId,
  adultoMayor: adultoRecord,
  attentionDate: "2026-08-16",
  attentionTime: "08:30",
  careType: "control_signos_vitales",
  reason: "Control",
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
  glucometriaContext: "ayunas",
  nursingNote: "Paciente estable.",
  professional: {
    userId: nurseUserId,
    fullName: nurseUser.fullName,
    role: nurseUser.role,
  },
  createdByUserId: nurseUserId,
  updatedByUserId: nurseUserId,
  version: 1,
  createdAt: new Date("2026-08-16T13:00:00.000Z"),
  updatedAt: new Date("2026-08-16T13:00:00.000Z"),
  deletedAt: null,
  deletedByUserId: null,
};

const { nursingNote: _nursingNote, ...listItemWithoutNote } = detailRecord;
const listItemRecord: AtencionEnfermeriaListItemRecord = listItemWithoutNote;

describe("AtencionesEnfermeriaService", () => {
  it("preloads the adult summary for a nurse within tenant scope", async () => {
    const repository = createRepository({
      adulto: adultoRecord,
      listItems: [],
    });
    const service = new AtencionesEnfermeriaService(repository);

    const result = await service.lookupAdultoMayor(adultoMayorId, nurseUser);

    assert.equal(result.adultoMayor.id, adultoMayorId);
    assert.equal(result.adultoMayor.age, 78);
    assert.deepEqual(repository.findAdultoMayorCalls[0], {
      adultoMayorId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("lists atenciones with the access flag derived from the actor", async () => {
    const repository = createRepository({
      adulto: adultoRecord,
      listItems: [{ ...listItemRecord, createdByUserId: otherNurseUserId }],
    });
    const service = new AtencionesEnfermeriaService(repository);

    const result = await service.listAtenciones(
      {
        search: null,
        tenantId: null,
        adultoMayorId: null,
        documentNumber: null,
        professionalUserId: null,
        attentionDate: null,
      },
      adminUser,
    );

    assert.equal(result.atencionesEnfermeria[0]?.access, "view");
    assert.deepEqual(repository.findManyCalls[0]?.scope, { type: "tenant", tenantId });
  });

  it("records the scoped history lookup for an adult", async () => {
    const repository = createRepository({
      adulto: adultoRecord,
      listItems: [listItemRecord],
    });
    const service = new AtencionesEnfermeriaService(repository);

    await service.getHistoriaClinica(adultoMayorId, nurseUser);

    assert.equal(repository.historyCalls[0]?.adultoMayorId, adultoMayorId);
    assert.equal(repository.historyCalls[0]?.scope?.type, "tenant");
    assert.equal(repository.historyCalls[0]?.scope?.tenantId, tenantId);
  });

  it("allows the medical role to read the nursing history and attention detail", async () => {
    const repository = createRepository({
      adulto: adultoRecord,
      listItems: [listItemRecord],
    });
    const service = new AtencionesEnfermeriaService(repository);

    const history = await service.getHistoriaClinica(adultoMayorId, medicUser);
    const detail = await service.getAtencion(recordId, medicUser);

    assert.equal(history.atenciones[0]?.access, "view");
    assert.equal(detail.id, recordId);
    assert.equal(
      repository.historyCalls[0]?.scope.type === "tenant"
        ? repository.historyCalls[0].scope.tenantId
        : undefined,
      tenantId,
    );
    assert.equal(
      repository.findByIdCalls[0]?.scope.type === "tenant"
        ? repository.findByIdCalls[0].scope.tenantId
        : undefined,
      tenantId,
    );
  });

  it("rejects history access when the adult belongs to another tenant", async () => {
    const repository = createRepository({
      adulto: null,
      listItems: [],
    });
    const service = new AtencionesEnfermeriaService(repository);

    let thrownError: unknown = null;

    try {
      await service.getHistoriaClinica(adultoMayorId, {
        ...nurseUser,
        tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      });
    } catch (error) {
      thrownError = error;
    }

    assert.ok(thrownError instanceof NotFoundException);
    assert.equal(repository.historyCalls.length, 0);
  });

  it("creates a nursing attention for the current nurse and maps repository errors", async () => {
    const repository = createRepository({ adulto: adultoRecord, listItems: [] });
    const service = new AtencionesEnfermeriaService(repository);

    const result = await service.createAtencion(
      {
        adultoMayorId,
        attentionDate: "2026-08-16",
        attentionTime: "08:30",
        careType: "control_signos_vitales",
        reason: null,
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
      },
      nurseUser,
    );

    assert.equal(result.id, recordId);
    assert.equal(repository.createCalls[0]?.actorUserId, nurseUserId);
    assert.equal(repository.createCalls[0]?.tenantId, tenantId);

    await assert.rejects(
      () =>
        service.createAtencion(
          {
            adultoMayorId,
            attentionDate: "2026-08-16",
            attentionTime: "08:30",
            careType: "control_signos_vitales",
            reason: null,
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
          },
          { ...nurseUser, role: "admin" },
        ),
      { constructor: ForbiddenException },
    );
  });

  it("rejects updates from another nurse and maps version conflicts", async () => {
    const repository = createRepository({
      adulto: adultoRecord,
      listItems: [detailRecord],
    });
    repository.updateResult = new AtencionEnfermeriaVersionConflictError();
    const service = new AtencionesEnfermeriaService(repository);

    await assert.rejects(
      () =>
        service.updateAtencion(
          recordId,
          {
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
            version: 1,
          },
          nurseUser,
        ),
      { constructor: ConflictException },
    );

    await assert.rejects(
      () =>
        service.updateAtencion(
          recordId,
          {
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
            version: 1,
          },
          { ...nurseUser, id: otherNurseUserId },
        ),
      { constructor: ForbiddenException },
    );
  });
});

function createRepository(seed: {
  adulto: AtencionEnfermeriaAdultoRecord | null;
  listItems: AtencionEnfermeriaListItemRecord[];
}) {
  return {
    adulto: seed.adulto,
    listItems: seed.listItems,
    findAdultoMayorCalls: [] as Array<{
      adultoMayorId: string;
      scope: { type: "all" } | { type: "tenant"; tenantId: string };
    }>,
    findManyCalls: [] as FindAtencionEnfermeriaListQuery[],
    findByIdCalls: [] as FindAtencionEnfermeriaByIdQuery[],
    historyCalls: [] as FindAtencionEnfermeriaHistoryByAdultoMayorQuery[],
    createCalls: [] as CreateAtencionEnfermeriaRecordCommand[],
    updateCalls: [] as UpdateAtencionEnfermeriaRecordCommand[],
    updateResult: null as Error | null,
    async findAdultoMayorById(query: {
      adultoMayorId: string;
      scope: { type: "all" } | { type: "tenant"; tenantId: string };
    }) {
      this.findAdultoMayorCalls.push(query);
      return this.adulto;
    },
    async findMany(query: FindAtencionEnfermeriaListQuery) {
      this.findManyCalls.push(query);
      return this.listItems;
    },
    async findById(query: FindAtencionEnfermeriaByIdQuery) {
      this.findByIdCalls.push(query);
      return detailRecord;
    },
    async findHistoryByAdultoMayor(query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery) {
      this.historyCalls.push(query);
      return this.listItems;
    },
    async create(command: CreateAtencionEnfermeriaRecordCommand) {
      this.createCalls.push(command);
      return detailRecord;
    },
    async update(command: UpdateAtencionEnfermeriaRecordCommand) {
      this.updateCalls.push(command);

      if (this.updateResult instanceof Error) {
        throw this.updateResult;
      }

      return detailRecord;
    },
    async findTrashByAdultoMayor(
      _query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
    ): Promise<AtencionEnfermeriaHistoryItemRecord[]> {
      return [];
    },
    async softDelete(_command: { id: string; actorUserId: string; tenantId: string }) {},
    async restore(_command: { id: string; actorUserId: string; tenantId: string }) {},
    async findAdultoMayorScopeById(_query: {
      adultoMayorId: string;
      scope: { type: "all" } | { type: "tenant"; tenantId: string };
    }) {
      return null;
    },
  } satisfies RepositoryStub;
}

type RepositoryStub = AtencionesEnfermeriaRepository & {
  adulto: AtencionEnfermeriaAdultoRecord | null;
  listItems: AtencionEnfermeriaListItemRecord[];
  findAdultoMayorCalls: Array<{
    adultoMayorId: string;
    scope: { type: "all" } | { type: "tenant"; tenantId: string };
  }>;
  findManyCalls: FindAtencionEnfermeriaListQuery[];
  findByIdCalls: FindAtencionEnfermeriaByIdQuery[];
  historyCalls: FindAtencionEnfermeriaHistoryByAdultoMayorQuery[];
  createCalls: CreateAtencionEnfermeriaRecordCommand[];
  updateCalls: UpdateAtencionEnfermeriaRecordCommand[];
  updateResult: Error | null;
};
