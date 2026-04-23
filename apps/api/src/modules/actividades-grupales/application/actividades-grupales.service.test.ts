import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { ActividadesGrupalesService } from "./actividades-grupales.service";
import {
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalRecord,
  type FindActividadesGrupalesQuery,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";

const medicoUser: AuthUser = {
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
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
    actaNumber: 3,
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
    actaNumber: 5,
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
    const service = new ActividadesGrupalesService(repository);

    const result = await service.listActividadesGrupales(
      { search: "bienestar", activityType: null, tenantId: null },
      medicoUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, tenantId);
    assert.deepEqual(repository.queries[0], {
      search: "bienestar",
      activityType: null,
      tenantId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows super admin users to filter the list by tenant", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    const result = await service.listActividadesGrupales(
      { search: null, activityType: null, tenantId: otherTenantId },
      superAdminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, otherTenantId);
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: null,
      tenantId: otherTenantId,
      scope: { type: "all" },
    });
  });

  it("filters the list by activity type", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    const result = await service.listActividadesGrupales(
      { search: null, activityType: "actividad_campo", tenantId: null },
      superAdminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.activityType, "actividad_campo");
    assert.deepEqual(repository.queries[0], {
      search: null,
      activityType: "actividad_campo",
      tenantId: null,
      scope: { type: "all" },
    });
  });

  it("forbids tenant users from querying another center", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    await assert.rejects(
      () =>
        service.listActividadesGrupales(
          { search: null, activityType: null, tenantId: otherTenantId },
          medicoUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("requires a tenant selection when super admin loads form options", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    await assert.rejects(() => service.getFormOptions({ tenantId: null }, superAdminUser), {
      constructor: BadRequestException,
    });
  });

  it("creates an activity with the actor tenant and active employees", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    const result = await service.createActividadGrupal(
      {
        tenantId: null,
        activityName: "Jornada psicomotriz",
        activityType: "fisioterapia",
        activityDate: "2026-04-23",
        startTime: "08:30",
        endTime: "10:00",
        organizer: "fisioterapeuta",
        employeeIds: ["empleado-1", "empleado-2"],
      },
      medicoUser,
    );

    assert.equal(result.tenantId, tenantId);
    assert.equal(result.actaNumber, 4);
    assert.equal(repository.created[0]?.tenantId, tenantId);
    assert.deepEqual(repository.created[0]?.employeeIds, ["empleado-1", "empleado-2"]);
  });

  it("rejects activities with employees outside the active tenant list", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    await assert.rejects(
      () =>
        service.createActividadGrupal(
          {
            tenantId: null,
            activityName: "Jornada nutricional",
            activityType: "nutricion",
            activityDate: "2026-04-23",
            startTime: "10:00",
            endTime: "11:00",
            organizer: "nutricionista",
            employeeIds: ["empleado-1", "empleado-inactivo"],
          },
          medicoUser,
        ),
      { constructor: BadRequestException },
    );
  });

  it("forbids users without tenant from managing activities", async () => {
    const repository = createRepository();
    const service = new ActividadesGrupalesService(repository);

    await assert.rejects(
      () =>
        service.listActividadesGrupales(
          { search: null, activityType: null, tenantId: null },
          tenantlessDirectorUser,
        ),
      { constructor: ForbiddenException },
    );
  });
});

function createRepository(): ActividadesGrupalesRepository & {
  created: { tenantId: string; employeeIds: string[] }[];
  queries: FindActividadesGrupalesQuery[];
} {
  const queries: FindActividadesGrupalesQuery[] = [];
  const created: { tenantId: string; employeeIds: string[] }[] = [];
  const employeesByTenant = new Map<string, ActividadGrupalEmpleadoOptionRecord[]>([
    [
      tenantId,
      [
        { id: "empleado-1", fullName: "Laura Perez", role: "medico" },
        { id: "empleado-2", fullName: "Ana Gomez", role: "enfermeria" },
      ],
    ],
    [otherTenantId, [{ id: "empleado-3", fullName: "Carlos Rojas", role: "director" }]],
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
        const matchesSearch =
          query.search === null ||
          record.activityName.toLowerCase().includes(query.search.toLowerCase());

        return matchesTenant && matchesActivityType && matchesSearch;
      });
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
    async getNextActaNumber() {
      return 4;
    },
    async create(command) {
      created.push({
        tenantId: command.tenantId,
        employeeIds: command.employeeIds,
      });

      return {
        id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
        tenantId: command.tenantId,
        tenantName: command.tenantId === tenantId ? "Centro de Vida Demo" : "Centro Norte",
        actaNumber: 4,
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
  };
}
