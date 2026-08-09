import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BadRequestException } from "@nestjs/common";

import { EpsService } from "./eps.service";
import { type EpsRepository } from "../domain/eps.repository";

const activeEps = {
  id: "33333333-3333-4333-8333-333333333333",
  code: "EPS001",
  name: "Salud Demo",
  isActive: true,
};

const inactiveEps = {
  id: "44444444-4444-4444-8444-444444444444",
  code: "EPS002",
  name: "Salud Anterior",
  isActive: false,
};

describe("EpsService", () => {
  it("lista opciones activas", async () => {
    const service = new EpsService(createRepository());

    assert.deepEqual(await service.listActive(), [
      { id: activeEps.id, code: activeEps.code, name: activeEps.name },
    ]);
  });

  it("acepta una EPS activa y permite conservar una inactiva ya asociada", async () => {
    const service = new EpsService(createRepository());

    assert.deepEqual(await service.resolveForWrite(activeEps.id), {
      id: activeEps.id,
      name: activeEps.name,
    });
    assert.deepEqual(await service.resolveForWrite(inactiveEps.id, inactiveEps.id), {
      id: inactiveEps.id,
      name: inactiveEps.name,
    });
  });

  it("rechaza EPS inexistentes o inactivas nuevas", async () => {
    const service = new EpsService(createRepository());

    await assert.rejects(() => service.resolveForWrite("55555555-5555-4555-8555-555555555555"), {
      constructor: BadRequestException,
      message: "La EPS seleccionada no existe.",
    });
    await assert.rejects(() => service.resolveForWrite(inactiveEps.id), {
      constructor: BadRequestException,
      message: "La EPS seleccionada no se encuentra activa.",
    });
  });
});

function createRepository(): EpsRepository {
  const records = [activeEps, inactiveEps];

  return {
    async findActive() {
      return records.filter((record) => record.isActive);
    },
    async findById(id) {
      return records.find((record) => record.id === id) ?? null;
    },
  };
}
