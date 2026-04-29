import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Cie10Controller } from "./cie10.controller";

describe("Cie10Controller", () => {
  it("passes parsed search queries to the service and wraps the options response", async () => {
    let receivedQuery: unknown = null;
    const controller = new Cie10Controller({
      searchOptions: async (query: unknown) => {
        receivedQuery = query;

        return [
          {
            code: "I10",
            title: "Hipertension esencial (primaria)",
          },
        ];
      },
    } as never);

    const result = await controller.searchOptions(
      {
        search: "hip",
      },
      {} as never,
    );

    assert.deepEqual(receivedQuery, { search: "hip" });
    assert.deepEqual(result, {
      options: [
        {
          code: "I10",
          title: "Hipertension esencial (primaria)",
        },
      ],
    });
  });
});
