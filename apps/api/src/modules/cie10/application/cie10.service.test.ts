import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { Cie10Service } from "./cie10.service";
import { type Cie10Repository } from "../domain/cie10.repository";

describe("Cie10Service", () => {
  it("returns no options when the search term is shorter than three characters", async () => {
    const repository = createRepository();
    const service = new Cie10Service(repository);

    const result = await service.searchOptions({ search: "i1" });

    assert.deepEqual(result, []);
    assert.equal(repository.searchQueries.length, 0);
  });

  it("searches the repository by code or name once the query reaches three characters", async () => {
    const repository = createRepository();
    const service = new Cie10Service(repository);

    const result = await service.searchOptions({ search: "  hip  " });

    assert.deepEqual(repository.searchQueries[0], {
      search: "hip",
      limit: 20,
    });
    assert.deepEqual(result, [
      {
        code: "G56.0",
        title: "Hipertension esencial (primaria)",
      },
    ]);
  });
});

function createRepository(): Cie10Repository & { searchQueries: Array<{ search: string; limit: number }> } {
  return {
    searchQueries: [],
    async searchOptions(query) {
      this.searchQueries.push(query);

      return [
        {
          code: "g560",
          title: "Hipertension esencial (primaria)",
        },
      ];
    },
  };
}
