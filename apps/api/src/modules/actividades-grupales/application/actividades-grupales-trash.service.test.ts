import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { ActividadesGrupalesTrashService } from "./actividades-grupales-trash.service";
import {
  type ActividadGrupalTrashRecord,
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalRecord,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";
const activityTypeId = "55555555-5555-4555-8555-555555555555";

const directorUser: AuthUser = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

const adminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const auditorUser: AuthUser = {
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  tenantId,
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
  passwordSetByAdmin: true,
};

describe("ActividadesGrupalesTrashService", () => {
  it("deletes an active acta into the deletion log without touching files", async () => {
    let deletedCommand: { activityId: string; actorUserId: string; reason: string } | null = null;
    const repository = createRepository({
      delete: async (command) => {
        deletedCommand = command;
      },
    });
    const service = new ActividadesGrupalesTrashService(repository);

    await service.sendToTrash(
      "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
      "Registro duplicado",
      adminUser,
    );

    assert.deepEqual(deletedCommand, {
      activityId: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
      actorUserId: adminUser.id,
      reason: "Registro duplicado",
    });
  });

  it("lists deleted actas as log records", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    const result = await service.listTrash(
      {
        search: null,
        activityType: null,
        activityTypeId: null,
        organizer: null,
        activityMonth: null,
        tenantId: null,
      },
      adminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "bd962778-117e-4275-aa07-1ea2f7a1d6f8");
    assert.equal(result[0]?.deletedByUserFullName, "Admin Centro Demo");
  });

  it("rejects auditors", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    await assert.rejects(
      () =>
        service.sendToTrash(
          "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
          "Registro duplicado",
          auditorUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("rejects directors from deleting actas", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    await assert.rejects(
      () =>
        service.sendToTrash(
          "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
          "Registro duplicado",
          directorUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("rejects auditors from listing the trash", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    await assert.rejects(
      () =>
        service.listTrash(
          {
            search: null,
            activityType: null,
            activityTypeId: null,
            organizer: null,
            activityMonth: null,
            tenantId: null,
          },
          auditorUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("rejects listing trash from another tenant", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    await assert.rejects(
      () =>
        service.listTrash(
          {
            search: null,
            activityType: null,
            activityTypeId: null,
            organizer: null,
            activityMonth: null,
            tenantId: otherTenantId,
          },
          adminUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("fails with not found when the acta is already in trash", async () => {
    const repository = createRepository({
      findById: async () => null,
    });
    const service = new ActividadesGrupalesTrashService(repository);

    await assert.rejects(
      () =>
        service.sendToTrash(
          "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
          "Registro duplicado",
          adminUser,
        ),
      {
        constructor: NotFoundException,
      },
    );
  });
});

function createRepository(
  overrides: Partial<ActividadesGrupalesRepository> = {},
): ActividadesGrupalesRepository {
  const activity = createActivityRecord();
  const trashActivity = createTrashActivityRecord();
  const detail = createDetail(activity);

  return {
    async findMany() {
      return [activity];
    },
    async findTrashMany() {
      return [trashActivity];
    },
    async findById() {
      return detail;
    },
    async findTrashById() {
      return trashActivity;
    },
    async findTenantOptions() {
      return [];
    },
    async findActiveEmpleadoOptions() {
      return [];
    },
    async searchIntegranteOptions() {
      return [];
    },
    async findIntegrantesByIds() {
      return [];
    },
    async create() {
      return activity;
    },
    async update() {
      return activity;
    },
    async correctActaNumber() {
      return activity;
    },
    async previewActaNumberCorrection() {
      return {
        operationToken: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
        operationId: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
        tenantId,
        previewExpiresAt: new Date("2026-04-23T12:15:00.000Z"),
        totalCount: 0,
        changedCount: 0,
        unchangedCount: 0,
        warningCount: 0,
        rows: [],
      };
    },
    async applyActaNumberCorrection() {
      return {
        operationId: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
        totalCount: 0,
        changedCount: 0,
        unchangedCount: 0,
      };
    },
    async delete() {
      return;
    },
    async saveDiligenciamiento() {
      return {
        detail,
        removedFiles: [],
      };
    },
    ...overrides,
  };
}

function createActivityRecord(): ActividadGrupalRecord {
  return {
    id: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
    tenantId,
    tenantName: "Centro de Vida Demo",
    createdByUserId: directorUser.id,
    actaNumber: "0003",
    actaOrganizer: "director",
    actaSequence: 3,
    previousActaNumber: null,
    activityName: "Encuentro de bienestar",
    activityType: "centro_vida",
    activityTypeId,
    activityTypeName: "Centro vida",
    activityTypeIsActive: true,
    activityDate: "2026-04-22",
    startTime: "08:00",
    endTime: "10:00",
    organizer: "director",
    involvedEmployeesCount: 2,
    createdAt: new Date("2026-04-22T12:00:00.000Z"),
    updatedAt: new Date("2026-04-22T12:00:00.000Z"),
  };
}

function createTrashActivityRecord(): ActividadGrupalTrashRecord {
  return {
    ...createActivityRecord(),
    deletedAt: new Date("2026-04-24T12:00:00.000Z"),
    deletedByUserId: adminUser.id,
    deletedByUserFullName: adminUser.fullName,
    deletionReason: "Registro duplicado",
  };
}

function createDetail(
  activity: ActividadGrupalRecord,
): ActividadGrupalDiligenciamientoDetailRecord {
  return {
    activity,
    assignedProfessionals: [],
    objectives: "",
    development: "",
    conclusion: "",
    responsibleDepartment: null,
    integrantes: [],
    photoFiles: [],
    pdfFile: null,
    diligenciamientoCreatedAt: null,
    diligenciamientoUpdatedAt: null,
  };
}
