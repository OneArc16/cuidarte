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
  it("permite consultar el catalogo con el permiso de lectura de sesiones", async () => {
    const repository = {
      findMany: async () => [],
    } as unknown as ActividadGrupalTiposRepository;
    const service = new ActividadGrupalTiposService(repository);

    assert.deepEqual(
      await service.list({ tenantId: null, includeInactive: true }, actor),
      [],
    );
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
