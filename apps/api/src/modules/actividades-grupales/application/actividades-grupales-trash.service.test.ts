import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ActividadesGrupalesTrashService } from "./actividades-grupales-trash.service";
import {
  type ActividadGrupalTrashRecord,
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalRecord,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";

const directorUser: AuthUser = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
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
  it("moves an active acta to the trash without touching files", async () => {
    let deletedCommand: { activityId: string; actorUserId: string } | null = null;
    const repository = createRepository({
      delete: async (command) => {
        deletedCommand = command;
      },
    });
    const service = new ActividadesGrupalesTrashService(repository);

    await service.sendToTrash("bd962778-117e-4275-aa07-1ea2f7a1d6f8", directorUser);

    assert.deepEqual(deletedCommand, {
      activityId: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
      actorUserId: directorUser.id,
    });
  });

  it("lists trashed actas with restoration metadata", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    const result = await service.listTrash(
      {
        search: null,
        activityType: null,
        organizer: null,
        activityMonth: null,
        tenantId: null,
      },
      directorUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.id, "bd962778-117e-4275-aa07-1ea2f7a1d6f8");
    assert.equal(result[0]?.canRestore, true);
    assert.equal(result[0]?.deletedByUserFullName, "Director Centro Demo");
  });

  it("restores an acta from the trash", async () => {
    let restoredCommand: { activityId: string; actorUserId: string } | null = null;
    const repository = createRepository({
      restore: async (command) => {
        restoredCommand = command;

        return true;
      },
    });
    const service = new ActividadesGrupalesTrashService(repository);

    await service.restore("bd962778-117e-4275-aa07-1ea2f7a1d6f8", directorUser);

    assert.deepEqual(restoredCommand, {
      activityId: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
      actorUserId: directorUser.id,
    });
  });

  it("rejects auditors", async () => {
    const service = new ActividadesGrupalesTrashService(createRepository());

    await assert.rejects(
      () => service.sendToTrash("bd962778-117e-4275-aa07-1ea2f7a1d6f8", auditorUser),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("rejects restore when the acta is already active or missing", async () => {
    const service = new ActividadesGrupalesTrashService(
      createRepository({
        findTrashById: async () => null,
      }),
    );

    await assert.rejects(
      () => service.restore("bd962778-117e-4275-aa07-1ea2f7a1d6f8", directorUser),
      {
        constructor: NotFoundException,
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
            organizer: null,
            activityMonth: null,
            tenantId: otherTenantId,
          },
          directorUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("rejects restore when the acta changed concurrently", async () => {
    const service = new ActividadesGrupalesTrashService(
      createRepository({
        restore: async () => false,
      }),
    );

    await assert.rejects(
      () => service.restore("bd962778-117e-4275-aa07-1ea2f7a1d6f8", directorUser),
      {
        constructor: ConflictException,
      },
    );
  });

  it("fails with not found when the acta is already in trash", async () => {
    const repository = createRepository({
      findById: async () => null,
    });
    const service = new ActividadesGrupalesTrashService(repository);

    await assert.rejects(
      () => service.sendToTrash("bd962778-117e-4275-aa07-1ea2f7a1d6f8", directorUser),
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
    async getNextActaNumber() {
      return 4;
    },
    async create() {
      return activity;
    },
    async update() {
      return activity;
    },
    async delete() {
      return;
    },
    async restore() {
      return true;
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
    activityName: "Encuentro de bienestar",
    activityType: "centro_vida",
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
    deletedByUserId: directorUser.id,
    deletedByUserFullName: directorUser.fullName,
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
