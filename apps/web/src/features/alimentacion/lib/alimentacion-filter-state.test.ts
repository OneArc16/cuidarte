import { beforeEach, describe, expect, it } from "vitest";

import {
  type AlimentacionFilterState,
  loadAlimentacionFilters,
  saveAlimentacionFilters,
} from "./alimentacion-filter-state";

const fallbackFilters: AlimentacionFilterState = {
  search: "",
  deliveryMonth: "2026-10",
  tenantId: "",
};

describe("alimentacion filter state", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("restores search, month and tenant for the same user", () => {
    const filters: AlimentacionFilterState = {
      search: "Abel Hernández",
      deliveryMonth: "",
      tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    };

    saveAlimentacionFilters("user-1", filters);

    expect(loadAlimentacionFilters("user-1", fallbackFilters)).toEqual(filters);
    expect(loadAlimentacionFilters("user-2", fallbackFilters)).toEqual(fallbackFilters);
  });

  it("uses fallback values for invalid stored filters", () => {
    window.sessionStorage.setItem(
      "cuidarte:alimentacion:filters:user-1",
      JSON.stringify({
        search: 25,
        deliveryMonth: "octubre-2026",
        tenantId: "centro-invalido",
      }),
    );

    expect(loadAlimentacionFilters("user-1", fallbackFilters)).toEqual(fallbackFilters);
  });
});
