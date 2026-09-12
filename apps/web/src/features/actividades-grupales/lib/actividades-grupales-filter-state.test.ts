import { describe, expect, it } from "vitest";

import {
  type ActividadesGrupalesFilterState,
  loadActividadesGrupalesFilters,
  saveActividadesGrupalesFilters,
} from "./actividades-grupales-filter-state";

const fallbackFilters: ActividadesGrupalesFilterState = {
  search: "",
  activityMonth: "2026-09",
  activityType: "",
  organizer: "",
  tenantId: "",
};

describe("actividades grupales filter state", () => {
  it("restores all filters, including Todos los meses", () => {
    const filters: ActividadesGrupalesFilterState = {
      search: "pausas",
      activityMonth: "",
      activityType: "salud_preventiva",
      organizer: "enfermeria",
      tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    };

    saveActividadesGrupalesFilters("user-1", filters);

    expect(loadActividadesGrupalesFilters("user-1", fallbackFilters)).toEqual(filters);
  });

  it("uses fallback values when stored filters are invalid", () => {
    window.sessionStorage.setItem(
      "cuidarte:actividades-grupales:filters:user-2",
      JSON.stringify({ activityMonth: "mes-invalido", activityType: "desconocido" }),
    );

    expect(loadActividadesGrupalesFilters("user-2", fallbackFilters)).toEqual({
      ...fallbackFilters,
      activityType: "",
      organizer: "",
    });
  });
});
