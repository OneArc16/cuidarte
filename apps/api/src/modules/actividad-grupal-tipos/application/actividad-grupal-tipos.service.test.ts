import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { ActividadGrupalTiposService } from "./actividad-grupal-tipos.service";
import { type ActividadGrupalTiposRepository } from "../domain/actividad-grupal-tipos.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const actor: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
  permissions: ["actividades_grupales.view"],
};

describe("ActividadGrupalTiposService", () => {
  it("filtra del formulario los tipos con serie especial no autorizados", async () => {
    const repository = {
      findMany: async () => [
        createTypeRecord({ id: "22222222-2222-4222-8222-222222222222", name: "Normal" }),
        createTypeRecord({
          id: "33333333-3333-4333-8333-333333333333",
          name: "Autorizada",
          consecutivePrefix: "AUTO",
          consecutiveNextValue: 1,
          consecutiveCreatorUserIds: [actor.id],
        }),
        createTypeRecord({
          id: "44444444-4444-4444-8444-444444444444",
          name: "Restringida",
          consecutivePrefix: "REST",
          consecutiveNextValue: 1,
          consecutiveCreatorUserIds: ["55555555-5555-4555-8555-555555555555"],
        }),
      ],
    } as unknown as ActividadGrupalTiposRepository;
    const service = new ActividadGrupalTiposService(repository);

    const result = await service.listForSessionForm(tenantId, actor);

    assert.deepEqual(
      result.map((activityType) => activityType.name),
      ["Normal", "Autorizada"],
    );
  });

  it("permite consultar el catalogo con el permiso de lectura de sesiones", async () => {
    const repository = {
      findMany: async () => [],
    } as unknown as ActividadGrupalTiposRepository;
    const service = new ActividadGrupalTiposService(repository);

    assert.deepEqual(await service.list({ tenantId: null, includeInactive: true }, actor), []);
  });

  it("no exige el permiso de ajustes para listar el catalogo", async () => {
    const repository = {
      findMany: async () => [],
    } as unknown as ActividadGrupalTiposRepository;
    const service = new ActividadGrupalTiposService(repository);

    await assert.doesNotReject(() =>
      service.list(
        { tenantId: null, includeInactive: true },
        { ...actor, permissions: ["ajustes.actividades.manage"] },
      ),
    );
  });
});

function createTypeRecord(
  overrides: Partial<
    Awaited<ReturnType<ActividadGrupalTiposRepository["findById"]>> extends infer T
      ? NonNullable<T>
      : never
  > = {},
) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    tenantId,
    name: "Actividad",
    normalizedName: "actividad",
    consecutivePrefix: null,
    consecutiveNextValue: null,
    consecutiveCreatorUserIds: [],
    isActive: true,
    createdAt: new Date("2026-09-24T12:00:00.000Z"),
    updatedAt: new Date("2026-09-24T12:00:00.000Z"),
    deactivatedAt: null,
    ...overrides,
  };
}
