import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { ActividadesGrupalesController } from "./actividades-grupales.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("ActividadesGrupalesController", () => {
  it("passes list queries and current user to the service", async () => {
    let receivedQuery: unknown = null;
    let receivedActorId: string | null = null;
    const service = {
      listActividadesGrupales: async (query: unknown, actor: AuthUser) => {
        receivedQuery = query;
        receivedActorId = actor.id;

        return [
          {
            id: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
            tenantId: currentUser.tenantId,
            tenantName: "Centro de Vida Demo",
            actaNumber: 3,
            activityName: "Encuentro de bienestar",
            activityType: "centro_vida",
            activityDate: "2026-04-22",
            startTime: "08:00",
            endTime: "10:00",
            organizer: "director",
            involvedEmployeesCount: 2,
            createdAt: "2026-04-22T12:00:00.000Z",
            updatedAt: "2026-04-22T12:00:00.000Z",
          },
        ];
      },
    };
    const controller = new ActividadesGrupalesController(service as never);

    const result = await controller.listActividadesGrupales(
      {
        search: "bienestar",
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedQuery, {
      search: "bienestar",
      activityType: null,
      tenantId: null,
    });
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.actividadesGrupales[0]?.activityName, "Encuentro de bienestar");
  });

  it("passes create commands and current user to the service", async () => {
    let receivedTenantId: string | null = "unexpected";
    const service = {
      createActividadGrupal: async (command: unknown) => {
        receivedTenantId = (command as { tenantId: string | null }).tenantId;

        return {
          id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
          tenantId: currentUser.tenantId,
          tenantName: "Centro de Vida Demo",
          actaNumber: 4,
          activityName: "Jornada psicomotriz",
          activityType: "fisioterapia",
          activityDate: "2026-04-23",
          startTime: "08:30",
          endTime: "10:00",
          organizer: "fisioterapeuta",
          involvedEmployeesCount: 2,
          createdAt: "2026-04-23T12:00:00.000Z",
          updatedAt: "2026-04-23T12:00:00.000Z",
        };
      },
    };
    const controller = new ActividadesGrupalesController(service as never);

    const result = await controller.createActividadGrupal(
      {
        tenantId: null,
        activityName: "Jornada psicomotriz",
        activityType: "fisioterapia",
        activityDate: "2026-04-23",
        startTime: "08:30",
        endTime: "10:00",
        organizer: "fisioterapeuta",
        employeeIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
      },
      { currentUser } as never,
    );

    assert.equal(receivedTenantId, null);
    assert.equal(result.actaNumber, 4);
    assert.equal(result.involvedEmployeesCount, 2);
  });
});
