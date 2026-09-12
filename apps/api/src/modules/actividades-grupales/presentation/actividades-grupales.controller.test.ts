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
            actaNumber: "0003",
            activityName: "Encuentro de bienestar",
            activityType: "centro_vida",
            activityDate: "2026-04-22",
            startTime: "08:00",
            endTime: "10:00",
            organizer: "director",
            involvedEmployeesCount: 2,
            canEdit: true,
            canDelete: true,
            createdAt: "2026-04-22T12:00:00.000Z",
            updatedAt: "2026-04-22T12:00:00.000Z",
          },
        ];
      },
    };
    const controller = new ActividadesGrupalesController(
      service as never,
      {} as never,
      {} as never,
    );

    const result = await controller.listActividadesGrupales(
      {
        search: "bienestar",
        organizer: "director",
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedQuery, {
      search: "bienestar",
      activityType: null,
      activityMonth: null,
      organizer: "director",
      tenantId: null,
    });
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.actividadesGrupales[0]?.activityName, "Encuentro de bienestar");
  });

  it("passes trash list queries and current user to the trash service", async () => {
    let receivedQuery: unknown = null;
    let receivedActorId: string | null = null;
    const trashService = {
      listTrash: async (query: unknown, actor: AuthUser) => {
        receivedQuery = query;
        receivedActorId = actor.id;

        return [
          {
            id: "bd962778-117e-4275-aa07-1ea2f7a1d6f8",
            tenantId: currentUser.tenantId,
            tenantName: "Centro de Vida Demo",
            actaNumber: "0003",
            activityName: "Encuentro de bienestar",
            activityType: "centro_vida",
            activityDate: "2026-04-22",
            startTime: "08:00",
            endTime: "10:00",
            organizer: "director",
            involvedEmployeesCount: 2,
            canEdit: false,
            canDelete: false,
            createdAt: "2026-04-22T12:00:00.000Z",
            updatedAt: "2026-04-22T12:00:00.000Z",
            deletedAt: "2026-04-24T12:00:00.000Z",
            deletedByUserId: currentUser.id,
            deletedByUserFullName: currentUser.fullName,
            deletionReason: "Registro duplicado",
            canRestore: true,
          },
        ];
      },
    };
    const controller = new ActividadesGrupalesController(
      {} as never,
      {} as never,
      trashService as never,
    );

    const result = await controller.listActividadesGrupalesTrash(
      {
        search: "bienestar",
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedQuery, {
      search: "bienestar",
      activityType: null,
      activityMonth: null,
      organizer: null,
      tenantId: null,
    });
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.actividadesGrupales[0]?.deletedByUserFullName, "Admin Centro Demo");
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
          actaNumber: "0004",
          actaOrganizer: "fisioterapeuta",
          actaSequence: 4,
          previousActaNumber: null,
          activityName: "Jornada psicomotriz",
          activityType: "fisioterapia",
          activityDate: "2026-04-23",
          startTime: "08:30",
          endTime: "10:00",
          organizer: "fisioterapeuta",
          involvedEmployeesCount: 2,
          canEdit: true,
          canDelete: true,
          createdAt: "2026-04-23T12:00:00.000Z",
          updatedAt: "2026-04-23T12:00:00.000Z",
        };
      },
    };
    const controller = new ActividadesGrupalesController(
      service as never,
      {} as never,
      {} as never,
    );

    const result = await controller.createActividadGrupal(
      {
        tenantId: null,
        actaNumber: "0004",
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
    assert.equal(result.actaNumber, "0004");
    assert.equal(result.involvedEmployeesCount, 2);
  });

  it("passes diligenciamiento detail requests and current user to the service", async () => {
    let receivedActivityId: string | null = null;
    let receivedActorId: string | null = null;
    const service = {
      getActividadGrupalDiligenciamiento: async (activityId: string, actor: AuthUser) => {
        receivedActivityId = activityId;
        receivedActorId = actor.id;

        return {
          id: "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
          tenantId: currentUser.tenantId,
          tenantName: "Centro de Vida Demo",
          actaNumber: "0004",
          actaOrganizer: "fisioterapeuta",
          actaSequence: 4,
          previousActaNumber: null,
          activityName: "Jornada psicomotriz",
          activityType: "fisioterapia",
          activityDate: "2026-04-23",
          startTime: "08:30",
          endTime: "10:00",
          organizer: "fisioterapeuta",
          involvedEmployeesCount: 2,
          canEdit: true,
          canDelete: true,
          assignedProfessionals: [
            {
              id: currentUser.id,
              fullName: currentUser.fullName,
              role: currentUser.role,
            },
          ],
          objectives: "",
          development: "",
          conclusion: "",
          responsibleDepartment: null,
          integrantes: [],
          photoFiles: [],
          pdfFile: null,
          diligenciamientoCreatedAt: null,
          diligenciamientoUpdatedAt: null,
          createdAt: "2026-04-23T12:00:00.000Z",
          updatedAt: "2026-04-23T12:00:00.000Z",
        };
      },
    };
    const controller = new ActividadesGrupalesController(
      service as never,
      {} as never,
      {} as never,
    );

    const result = await controller.getActividadGrupalDiligenciamiento(
      "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
      { currentUser } as never,
    );

    assert.equal(receivedActivityId, "5f0361fb-ff51-43d7-a6e8-83c58df345b6");
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.activityName, "Jornada psicomotriz");
    assert.equal(result.assignedProfessionals[0]?.id, currentUser.id);
  });

  it("exports the acta pdf inline", async () => {
    let receivedActivityId: string | null = null;
    let receivedActorId: string | null = null;
    let sentPayload: unknown = null;
    const headers: Record<string, string> = {};
    const exportService = {
      exportPdf: async (activityId: string, actor: AuthUser) => {
        receivedActivityId = activityId;
        receivedActorId = actor.id;

        return {
          buffer: Buffer.from("pdf"),
          contentType: "application/pdf",
          filename: "acta-sesion-grupal-0004.pdf",
        };
      },
    };
    const reply = {
      header(name: string, value: string) {
        headers[name] = value;

        return this;
      },
      send(payload: Buffer) {
        sentPayload = payload;

        return payload;
      },
    };
    const controller = new ActividadesGrupalesController(
      {} as never,
      exportService as never,
      {} as never,
    );

    await controller.exportActividadGrupalActaPdf(
      "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
      { currentUser } as never,
      reply as never,
    );

    assert.equal(receivedActivityId, "5f0361fb-ff51-43d7-a6e8-83c58df345b6");
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(headers["Content-Type"], "application/pdf");
    assert.equal(headers["Content-Disposition"], 'inline; filename="acta-sesion-grupal-0004.pdf"');
    assert.equal(Buffer.isBuffer(sentPayload), true);
    assert.equal((sentPayload as Buffer).toString("utf8"), "pdf");
  });

  it("sends the acta to the trash with the current user", async () => {
    let receivedActivityId: string | null = null;
    let receivedActorId: string | null = null;
    let receivedReason: string | null = null;
    const trashService = {
      sendToTrash: async (activityId: string, reason: string, actor: AuthUser) => {
        receivedActivityId = activityId;
        receivedReason = reason;
        receivedActorId = actor.id;
      },
    };
    const controller = new ActividadesGrupalesController(
      {} as never,
      {} as never,
      trashService as never,
    );

    const result = await controller.deleteActividadGrupal(
      "5f0361fb-ff51-43d7-a6e8-83c58df345b6",
      { reason: "Registro duplicado" },
      { currentUser } as never,
    );

    assert.equal(receivedActivityId, "5f0361fb-ff51-43d7-a6e8-83c58df345b6");
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(receivedReason, "Registro duplicado");
    assert.deepEqual(result, { success: true });
  });

  it("restores the acta from the trash with the current user", async () => {
    let receivedActivityId: string | null = null;
    let receivedActorId: string | null = null;
    const trashService = {
      restore: async (activityId: string, actor: AuthUser) => {
        receivedActivityId = activityId;
        receivedActorId = actor.id;
      },
    };
    const controller = new ActividadesGrupalesController(
      {} as never,
      {} as never,
      trashService as never,
    );

    const result = await controller.restoreActividadGrupal("5f0361fb-ff51-43d7-a6e8-83c58df345b6", {
      currentUser,
    } as never);

    assert.equal(receivedActivityId, "5f0361fb-ff51-43d7-a6e8-83c58df345b6");
    assert.equal(receivedActorId, currentUser.id);
    assert.deepEqual(result, { success: true });
  });
});
