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
    const controller = new AlimentacionController(service as never, {} as never, {} as never);

    const result = await controller.listRegistros(
      {
        search: "Rosa",
        deliveryMonth: "2026-04",
      },
      { currentUser } as never,
    );

    assert.deepEqual(receivedQuery, {
      search: "Rosa",
      deliveryMonth: "2026-04",
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
    const controller = new AlimentacionController(service as never, {} as never, {} as never);

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

  it("passes delete requests to the service", async () => {
    let receivedId: string | null = null;
    let receivedActorId: string | null = null;
    const service = {
      deleteRegistro: async (id: string, actor: AuthUser) => {
        receivedId = id;
        receivedActorId = actor.id;
      },
    };
    const controller = new AlimentacionController(service as never, {} as never, {} as never);

    const result = await controller.deleteRegistro(
      "1a3782f0-b999-412c-a0f4-31ed47cb8f3f",
      { currentUser } as never,
    );

    assert.equal(receivedId, "1a3782f0-b999-412c-a0f4-31ed47cb8f3f");
    assert.equal(receivedActorId, currentUser.id);
    assert.deepEqual(result, { success: true });
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
    const controller = new AlimentacionController(service as never, {} as never, {} as never);

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

  it("exports formato entrega pdf inline", async () => {
    let receivedAdultoMayorId: string | null = null;
    let receivedActorId: string | null = null;
    let receivedQuery: { deliveryMonth: string } | null = null;
    let sentPayload: unknown = null;
    const headers: Record<string, string> = {};
    const exportService = {
      exportPdf: async (
        adultoMayorId: string,
        query: { deliveryMonth: string },
        actor: AuthUser,
      ) => {
        receivedAdultoMayorId = adultoMayorId;
        receivedQuery = query;
        receivedActorId = actor.id;

        return {
          buffer: Buffer.from("pdf"),
          contentType: "application/pdf",
          filename: "formato-entrega-1020304050-2026-04.pdf",
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
    const controller = new AlimentacionController({} as never, exportService as never, {} as never);

    await controller.exportFormatoEntregaPdf(
      "0b17e370-8f81-48c0-b707-c7046f497855",
      { deliveryMonth: "2026-04" },
      { currentUser } as never,
      reply as never,
    );

    assert.equal(receivedAdultoMayorId, "0b17e370-8f81-48c0-b707-c7046f497855");
    assert.equal(receivedActorId, currentUser.id);
    assert.deepEqual(receivedQuery, { deliveryMonth: "2026-04" });
    assert.equal(headers["Content-Type"], "application/pdf");
    assert.equal(
      headers["Content-Disposition"],
      'inline; filename="formato-entrega-1020304050-2026-04.pdf"',
    );
    assert.equal(Buffer.isBuffer(sentPayload), true);
    assert.equal((sentPayload as Buffer).toString("utf8"), "pdf");
  });

  it("buffers the multipart PDF and forwards the month and current user to the import service", async () => {
    let receivedAdultoMayorId: string | null = null;
    let receivedMonth: string | null = null;
    let receivedUpload: { originalName: string; mimeType: string; sizeBytes: number } | null = null;
    let receivedActorId: string | null = null;
    const importedFormatoService = {
      async importPdf(
        adultoMayorId: string,
        query: { deliveryMonth: string },
        upload: { originalName: string; mimeType: string; sizeBytes: number },
        actor: AuthUser,
      ) {
        receivedAdultoMayorId = adultoMayorId;
        receivedMonth = query.deliveryMonth;
        receivedUpload = {
          originalName: upload.originalName,
          mimeType: upload.mimeType,
          sizeBytes: upload.sizeBytes,
        };
        receivedActorId = actor.id;

        return {
          version: {
            id: "1a3782f0-b999-412c-a0f4-31ed47cb8f3f",
            version: 1,
            originalName: upload.originalName,
            mimeType: "application/pdf" as const,
            sizeBytes: upload.sizeBytes,
            importedByUserId: actor.id,
            importedByUserFullName: actor.fullName,
            importedAt: "2026-04-24T12:00:00.000Z",
          },
        };
      },
    };
    const controller = new AlimentacionController(
      {} as never,
      {} as never,
      importedFormatoService as never,
    );
    const pdf = Buffer.from("%PDF-1.7\\ncontenido");
    const request = {
      currentUser,
      isMultipart: () => true,
      async *parts() {
        yield {
          type: "file",
          fieldname: "file",
          filename: "formato-diligenciado.pdf",
          mimetype: "application/pdf",
          toBuffer: async () => pdf,
        };
      },
    };

    const response = await controller.importFormatoEntregaPdf(
      "0b17e370-8f81-48c0-b707-c7046f497855",
      { deliveryMonth: "2026-04" },
      request as never,
    );

    assert.equal(receivedAdultoMayorId, "0b17e370-8f81-48c0-b707-c7046f497855");
    assert.equal(receivedMonth, "2026-04");
    assert.deepEqual(receivedUpload, {
      originalName: "formato-diligenciado.pdf",
      mimeType: "application/pdf",
      sizeBytes: pdf.byteLength,
    });
    assert.equal(receivedActorId, currentUser.id);
    assert.equal(response.version.version, 1);
  });
});
