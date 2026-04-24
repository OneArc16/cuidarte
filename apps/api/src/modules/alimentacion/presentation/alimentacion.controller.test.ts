import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { AlimentacionController } from "./alimentacion.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("AlimentacionController", () => {
  it("passes list queries and current user to the service", async () => {
    let receivedQuery: unknown = null;
    let receivedActorId: string | null = null;
    const service = {
      listRegistros: async (query: unknown, actor: AuthUser) => {
        receivedQuery = query;
        receivedActorId = actor.id;

        return [
          {
            id: "1a3782f0-b999-412c-a0f4-31ed47cb8f3f",
            tenantId: currentUser.tenantId!,
            tenantName: "Centro de Vida Demo",
            adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
            documentNumber: "1020304050",
            fullName: "Rosa Elena Martinez Rojas",
            deliveryDate: "2026-04-24",
            organizer: "nutricionista",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "no_aplica",
            auxilioTransporte: "no_entregado",
            createdAt: "2026-04-24T12:00:00.000Z",
            updatedAt: "2026-04-24T12:00:00.000Z",
          },
        ];
      },
    };
    const controller = new AlimentacionController(service as never);

    const result = await controller.listRegistros(
      {
        search: "Rosa",
        deliveryDate: "2026-04-24",
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedQuery, {
      search: "Rosa",
      deliveryDate: "2026-04-24",
      tenantId: null,
    });
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(result.registros[0]?.fullName, "Rosa Elena Martinez Rojas");
  });

  it("passes create batch commands to the service", async () => {
    let receivedCommand: unknown = null;
    const service = {
      createBatch: async (command: unknown) => {
        receivedCommand = command;

        return { createdCount: 1 };
      },
    };
    const controller = new AlimentacionController(service as never);

    const result = await controller.createBatch(
      {
        tenantId: null,
        deliveryDate: "2026-04-24",
        organizer: "nutricionista",
        registros: [
          {
            adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "no_aplica",
            auxilioTransporte: "no_entregado",
          },
        ],
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedCommand, {
      tenantId: null,
      deliveryDate: "2026-04-24",
      organizer: "nutricionista",
      registros: [
        {
          adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
          refrigerio1: "entregado",
          almuerzo: "entregado",
          refrigerio2: "no_aplica",
          auxilioTransporte: "no_entregado",
        },
      ],
    });
    assert.equal(result.createdCount, 1);
  });

  it("passes adult lookup requests to the service", async () => {
    let receivedAdultoMayorId: string | null = null;
    let receivedDeliveryDate: string | null = null;
    const service = {
      lookupAdultoMayorByDate: async (
        adultoMayorId: string,
        query: { deliveryDate: string },
        actor: AuthUser,
      ) => {
        receivedAdultoMayorId = adultoMayorId;
        receivedDeliveryDate = query.deliveryDate;
        assert.equal(actor.id, currentUser.id);

        return {
          adultoMayor: {
            id: adultoMayorId,
            tenantId: currentUser.tenantId!,
            tenantName: "Centro de Vida Demo",
            documentNumber: "1020304050",
            fullName: "Rosa Elena Martinez Rojas",
          },
          existingRecordId: null,
        };
      },
    };
    const controller = new AlimentacionController(service as never);

    const result = await controller.lookupAdultoMayorByDate(
      "0b17e370-8f81-48c0-b707-c7046f497855",
      { deliveryDate: "2026-04-24" },
      { currentUser } as never,
    );

    assert.equal(receivedAdultoMayorId, "0b17e370-8f81-48c0-b707-c7046f497855");
    assert.equal(receivedDeliveryDate, "2026-04-24");
    assert.equal(result.existingRecordId, null);
    assert.equal(result.adultoMayor.fullName, "Rosa Elena Martinez Rojas");
  });
});
