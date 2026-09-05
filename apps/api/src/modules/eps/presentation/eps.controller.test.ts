import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { EpsController } from "./eps.controller";

describe("EpsController", () => {
  it("devuelve el contrato de opciones", async () => {
    const controller = new EpsController({
      async listActive() {
        return [
          {
            id: "33333333-3333-4333-8333-333333333333",
            code: "EPS001",
            name: "Salud Demo",
          },
        ];
      },
    } as never);

    assert.deepEqual(await controller.list({} as never), {
      eps: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          code: "EPS001",
          name: "Salud Demo",
        },
      ],
    });
  });
});
