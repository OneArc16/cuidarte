import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { ActividadesGrupalesService } from "./actividades-grupales.service";
import {
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalIntegranteOptionRecord,
  type ActividadGrupalRecord,
  type FindActividadesGrupalesQuery,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesFilesStorage } from "../domain/actividades-grupales-files.storage";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";
const medicoUserId = "11111111-1111-4111-8111-111111111111";
const enfermeriaUserId = "22222222-2222-4222-8222-222222222222";
const directorUserId = "33333333-3333-4333-8333-333333333333";
const inactiveEmpleadoId = "44444444-4444-4444-8444-444444444444";

const medicoUser: AuthUser = {
  id: medicoUserId,
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

const enfermeriaUser: AuthUser = {
  id: enfermeriaUserId,
  tenantId,
  email: "enfermeria@centro-demo.test",
  fullName: "Enfermera Centro Demo",
  role: "enfermeria",
  passwordSetByAdmin: true,
};

const superAdminUser: AuthUser = {
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
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

const tenantlessDirectorUser: AuthUser = {
  id: "7b820700-fd7d-4b2e-9d61-2e4bca413c8a",
  tenantId: null,
  email: "director@sin-centro.test",
  fullName: "Director Sin Centro",
  role: "director",
  passwordSetByAdmin: true,
};

const records: ActividadGrupalRecord[] = [
  {
    id: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
    tenantId,
    tenantName: "Centro de Vida Demo",
    createdByUserId: medicoUserId,
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
  },
  {
    id: "79124572-44a5-45be-b5d6-7069cb4fca29",
    tenantId: otherTenantId,
    tenantName: "Centro Norte",
    createdByUserId: directorUserId,
    actaNumber: "0005",
    activityName: "Actividad externa",
    activityType: "actividad_campo",
    activityDate: "2026-04-21",
    startTime: "09:00",
    endTime: "11:00",
    organizer: "trabajadora_social",
    involvedEmployeesCount: 3,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
];

describe("ActividadesGrupalesService", () => {
  it("allows tenant professionals to list activities within their tenant scope", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.listActividadesGrupales(
      {
        search: "bienestar",
        activityType: null,
        organizer: null,
        activityMonth: null,
        tenantId: null,
      },
      medicoUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, tenantId);
    assert.deepEqual(repository.queries[0], {
      search: "bienestar",
      activityType: null,
      organizer: null,
      activityMonth: null,
      tenantId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows super admin users to filter the list by tenant", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.listActividadesGrupales(
      {
        search: null,
        activityType: null,
        organizer: null,
        activityMonth: null,
        tenantId: otherTenantId,
      },
      superAdminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, otherTenantId);
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: null,
      organizer: null,
      activityMonth: null,
      tenantId: otherTenantId,
      scope: { type: "all" },
    });
  });

  it("allows auditor users to list activities in their tenant scope", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.listActividadesGrupales(
      { search: null, activityType: null, organizer: null, activityMonth: null, tenantId: null },
      auditorUser,
    );

    assert.equal(result.length, 1);
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: null,
      organizer: null,
      activityMonth: null,
      tenantId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("filters the list by activity type", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.listActividadesGrupales(
      {
        search: null,
        activityType: "actividad_campo",
        organizer: null,
        activityMonth: null,
        tenantId: null,
      },
      superAdminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.activityType, "actividad_campo");
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: "actividad_campo",
      organizer: null,
      activityMonth: null,
      tenantId: null,
      scope: { type: "all" },
    });
  });

  it("filters the list by organizer", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.listActividadesGrupales(
      {
        search: null,
        activityType: null,
        organizer: "trabajadora_social",
        activityMonth: null,
        tenantId: null,
      },
      superAdminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.organizer, "trabajadora_social");
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: null,
      organizer: "trabajadora_social",
      activityMonth: null,
      tenantId: null,
      scope: { type: "all" },
    });
  });

  it("forbids tenant users from querying another center", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    await assert.rejects(
      () =>
        service.listActividadesGrupales(
          {
            search: null,
            activityType: null,
            organizer: null,
            activityMonth: null,
            tenantId: otherTenantId,
          },
          medicoUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("requires a tenant selection when super admin loads form options", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    await assert.rejects(() => service.getFormOptions({ tenantId: null }, superAdminUser), {
      constructor: BadRequestException,
    });
  });

  it("creates an activity with the actor tenant and active employees", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    const result = await service.createActividadGrupal(
      {
        tenantId: null,
        actaNumber: "0004",
        activityName: "Jornada psicomotriz",
        activityType: "fisioterapia",
        activityDate: "2026-04-23",
        startTime: "08:30",
        endTime: "10:00",
        organizer: "fisioterapeuta",
        employeeIds: [medicoUserId, enfermeriaUserId],
      },
      medicoUser,
    );

    assert.equal(result.tenantId, tenantId);
    assert.equal(result.actaNumber, "0004");
    assert.equal(repository.created[0]?.tenantId, tenantId);
    assert.equal(repository.created[0]?.actaNumber, "0004");
    assert.deepEqual(repository.created[0]?.employeeIds, [medicoUserId, enfermeriaUserId]);
  });

  it("rejects activities with employees outside the active tenant list", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    await assert.rejects(
      () =>
        service.createActividadGrupal(
          {
            tenantId: null,
            actaNumber: "0004-A",
            activityName: "Jornada nutricional",
            activityType: "nutricion",
            activityDate: "2026-04-23",
            startTime: "10:00",
            endTime: "11:00",
            organizer: "nutricionista",
            employeeIds: [medicoUserId, inactiveEmpleadoId],
          },
          medicoUser,
        ),
      { constructor: BadRequestException },
    );
  });

  it("forbids users without tenant from managing activities", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    await assert.rejects(
      () =>
        service.listActividadesGrupales(
          {
            search: null,
            activityType: null,
            organizer: null,
            activityMonth: null,
            tenantId: null,
          },
          tenantlessDirectorUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("allows assigned professionals to load diligenciamiento detail", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());
    const targetRecord = records[0]!;

    const result = await service.getActividadGrupalDiligenciamiento(targetRecord.id, medicoUser);

    assert.equal(result.id, targetRecord.id);
    assert.equal(result.assignedProfessionals[0]?.id, medicoUser.id);
  });

  it("enables edit mode for assigned professionals that did not create the activity", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());
    const targetRecord = records[0]!;

    const result = await service.getActividadGrupalDiligenciamiento(
      targetRecord.id,
      enfermeriaUser,
    );

    assert.equal(result.id, targetRecord.id);
    assert.equal(result.canEdit, true);
    assert.equal(result.canDelete, false);
  });

  it("allows auditor users to open diligenciamiento details in read-only mode", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());
    const targetRecord = records[0]!;

    const result = await service.getActividadGrupalDiligenciamiento(targetRecord.id, auditorUser);

    assert.equal(result.id, targetRecord.id);
    assert.equal(result.assignedProfessionals.length > 0, true);
  });

  it("rejects diligenciamiento when integrantes belong to another center", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());
    const targetRecord = records[0]!;

    await assert.rejects(
      () =>
        service.saveActividadGrupalDiligenciamiento(
          {
            activityId: targetRecord.id,
            payload: {
              objectives: "Objetivos",
              development: "Desarrollo",
              conclusion: "Conclusion",
              responsibleDepartment: "nutricion",
              integranteIds: ["377d9726-e3e3-4357-82bd-8f16c2d73052"],
              removedPhotoFileIds: [],
              removePdfFile: false,
            },
            newPhotos: [],
            newPdf: null,
          },
          medicoUser,
        ),
      { constructor: BadRequestException },
    );
  });

  it("allows saving diligenciamiento without integrantes", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());
    const targetRecord = records[0]!;

    const result = await service.saveActividadGrupalDiligenciamiento(
      {
        activityId: targetRecord.id,
        payload: {
          objectives: "Objetivos",
          development: "Desarrollo",
          conclusion: "Conclusion",
          responsibleDepartment: "nutricion",
          integranteIds: [],
          removedPhotoFileIds: [],
          removePdfFile: false,
        },
        newPhotos: [],
        newPdf: null,
      },
      medicoUser,
    );

    assert.deepEqual(result.integrantes, []);
  });

  it("forbids auditor users from create and diligenciamiento actions", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository, createFilesStorage());

    await assert.rejects(() => service.getFormOptions({ tenantId }, auditorUser), {
      constructor: ForbiddenException,
    });

    await assert.rejects(
      () =>
        service.createActividadGrupal(
          {
            tenantId: null,
            actaNumber: "ACTA-LECTURA-01",
            activityName: "Actividad en lectura",
            activityType: "centro_vida",
            activityDate: "2026-04-23",
            startTime: "08:30",
            endTime: "10:00",
            organizer: "director",
            employeeIds: [medicoUserId],
          },
          auditorUser,
        ),
      { constructor: ForbiddenException },
    );

    await assert.rejects(
      () =>
        service.saveActividadGrupalDiligenciamiento(
          {
            activityId: records[0]!.id,
            payload: {
              objectives: "Objetivos",
              development: "Desarrollo",
              conclusion: "Conclusion",
              responsibleDepartment: "nutricion",
              integranteIds: ["25ce51a5-f0a6-4374-a6b4-815348cbd26d"],
              removedPhotoFileIds: [],
              removePdfFile: false,
            },
            newPhotos: [],
            newPdf: null,
          },
          auditorUser,
        ),
      { constructor: ForbiddenException },
    );
  });
});

function createRepository(): ActividadesGrupalesRepository & {
  created: { tenantId: string; actaNumber: string; employeeIds: string[] }[];
  queries: FindActividadesGrupalesQuery[];
} {
  const queries: FindActividadesGrupalesQuery[] = [];
  const created: { tenantId: string; actaNumber: string; employeeIds: string[] }[] = [];
  const employeesByTenant = new Map<string, ActividadGrupalEmpleadoOptionRecord[]>([
    [
      tenantId,
      [
        { id: medicoUserId, fullName: "Laura Perez", role: "medico" },
        { id: enfermeriaUserId, fullName: "Ana Gomez", role: "enfermeria" },
      ],
    ],
    [otherTenantId, [{ id: directorUserId, fullName: "Carlos Rojas", role: "director" }]],
  ]);
  const integrantesByTenant = new Map<string, ActividadGrupalIntegranteOptionRecord[]>([
    [
      tenantId,
      [
        {
          id: "25ce51a5-f0a6-4374-a6b4-815348cbd26d",
          documentNumber: "1020304050",
          fullName: "Rosa Elena Martinez Rojas",
        },
      ],
    ],
    [
      otherTenantId,
      [
        {
          id: "377d9726-e3e3-4357-82bd-8f16c2d73052",
          documentNumber: "9988776655",
          fullName: "Marta Ines Castro",
        },
      ],
    ],
  ]);

  return {
    created,
    queries,
    async findMany(query) {
      queries.push(query);

      return records.filter((record) => {
        const matchesTenant =
          query.scope.type === "tenant"
            ? record.tenantId === query.scope.tenantId
            : query.tenantId === null || record.tenantId === query.tenantId;
        const matchesActivityType =
          query.activityType === null || record.activityType === query.activityType;
        const matchesOrganizer = query.organizer === null || record.organizer === query.organizer;
        const matchesSearch =
          query.search === null ||
          record.activityName.toLowerCase().includes(query.search.toLowerCase());

        return matchesTenant && matchesActivityType && matchesOrganizer && matchesSearch;
      });
    },
    async findTrashMany() {
      return [];
    },
    async findTenantOptions() {
      return [
        { id: tenantId, name: "Centro de Vida Demo" },
        { id: otherTenantId, name: "Centro Norte" },
      ];
    },
    async findActiveEmpleadoOptions(requestedTenantId) {
      return employeesByTenant.get(requestedTenantId) ?? [];
    },
    async findById({ activityId, scope }) {
      const record = records.find((item) => item.id === activityId);

      if (record === undefined) {
        return null;
      }

      if (scope.type === "tenant" && scope.tenantId !== record.tenantId) {
        return null;
      }

      return toDiligenciamientoDetail(record, employeesByTenant, integrantesByTenant);
    },
    async findTrashById() {
      return null;
    },
    async searchIntegranteOptions({ tenantId: requestedTenantId, search }) {
      const integrantes = integrantesByTenant.get(requestedTenantId) ?? [];

      if (search === null) {
        return integrantes;
      }

      return integrantes.filter((integrante) =>
        [integrante.documentNumber, integrante.fullName]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      );
    },
    async findIntegrantesByIds(requestedTenantId, integranteIds) {
      const integrantes = integrantesByTenant.get(requestedTenantId) ?? [];

      return integrantes.filter((integrante) => integranteIds.includes(integrante.id));
    },
    async getNextActaNumber() {
      return 4;
    },
    async create(command) {
      created.push({
        tenantId: command.tenantId,
        actaNumber: command.actaNumber,
        employeeIds: command.employeeIds,
      });

      return {
        id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
        tenantId: command.tenantId,
        tenantName: command.tenantId === tenantId ? "Centro de Vida Demo" : "Centro Norte",
        createdByUserId: command.actorUserId,
        actaNumber: command.actaNumber,
        activityName: command.activityName,
        activityType: command.activityType,
        activityDate: command.activityDate,
        startTime: command.startTime,
        endTime: command.endTime,
        organizer: command.organizer,
        involvedEmployeesCount: command.employeeIds.length,
        createdAt: new Date("2026-04-23T12:00:00.000Z"),
        updatedAt: new Date("2026-04-23T12:00:00.000Z"),
      };
    },
    async update(command) {
      const record = records.find((item) => item.id === command.activityId);

      if (record === undefined) {
        throw new Error("Activity not found in test repository.");
      }

      return {
        ...record,
        actaNumber: command.actaNumber,
        activityName: command.activityName,
        activityType: command.activityType,
        activityDate: command.activityDate,
        startTime: command.startTime,
        endTime: command.endTime,
        organizer: command.organizer,
        involvedEmployeesCount: command.employeeIds.length,
        updatedAt: new Date("2026-04-23T12:00:00.000Z"),
      };
    },
    async delete(command) {
      const record = records.find((item) => item.id === command.activityId);

      if (record === undefined) {
        return;
      }

      return;
    },
    async restore() {
      return true;
    },
    async saveDiligenciamiento(command) {
      const record = records.find((item) => item.id === command.activityId);

      if (record === undefined) {
        throw new Error("Activity not found in test repository.");
      }

      return {
        detail: {
          ...toDiligenciamientoDetail(record, employeesByTenant, integrantesByTenant),
          objectives: command.objectives,
          development: command.development,
          conclusion: command.conclusion,
          responsibleDepartment: command.responsibleDepartment,
          integrantes: (integrantesByTenant.get(record.tenantId) ?? []).filter((integrante) =>
            command.integranteIds.includes(integrante.id),
          ),
          photoFiles: command.newFiles
            .filter((file) => file.kind === "support_photo")
            .map((file, index) => ({
              id: `photo-${index}`,
              activityId: command.activityId,
              kind: file.kind,
              originalName: file.originalName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              relativePath: file.relativePath,
              createdAt: new Date("2026-04-23T12:00:00.000Z"),
            })),
          pdfFile:
            command.newFiles.find((file) => file.kind === "support_pdf") === undefined
              ? null
              : {
                  id: "pdf-1",
                  activityId: command.activityId,
                  kind: "support_pdf",
                  originalName: "soporte.pdf",
                  mimeType: "application/pdf",
                  sizeBytes: 1024,
                  relativePath: "pdf/soporte.pdf",
                  createdAt: new Date("2026-04-23T12:00:00.000Z"),
                },
          diligenciamientoCreatedAt: new Date("2026-04-23T12:00:00.000Z"),
          diligenciamientoUpdatedAt: new Date("2026-04-23T12:00:00.000Z"),
        },
        removedFiles: [],
      };
    },
  };
}

function createFilesStorage(): ActividadesGrupalesFilesStorage {
  return {
    async saveFile(activity, kind, file) {
      return {
        kind,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        relativePath: `${activity.tenantId}/${activity.activityId}/${kind}/${file.originalName}`,
      };
    },
    async readFile() {
      return {
        buffer: Buffer.from("file"),
        contentType: "application/octet-stream",
        originalName: "file.bin",
      };
    },
    async deleteFile() {
      return;
    },
  };
}

function toDiligenciamientoDetail(
  record: ActividadGrupalRecord,
  employeesByTenant: Map<string, ActividadGrupalEmpleadoOptionRecord[]>,
  integrantesByTenant: Map<string, ActividadGrupalIntegranteOptionRecord[]>,
): ActividadGrupalDiligenciamientoDetailRecord {
  return {
    activity: record,
    assignedProfessionals: employeesByTenant.get(record.tenantId) ?? [],
    objectives: "",
    development: "",
    conclusion: "",
    responsibleDepartment: null,
    integrantes: integrantesByTenant.get(record.tenantId) ?? [],
    photoFiles: [],
    pdfFile: null,
    diligenciamientoCreatedAt: null,
    diligenciamientoUpdatedAt: null,
  };
}
