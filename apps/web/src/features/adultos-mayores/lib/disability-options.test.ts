import { describe, expect, it } from "vitest";

import { DISABILITY_OPTIONS, buildDisabilityOptions } from "./disability-options";

describe("buildDisabilityOptions", () => {
  it("expone el catalogo base de discapacidades", () => {
    expect(DISABILITY_OPTIONS).toHaveLength(8);
    expect(DISABILITY_OPTIONS.map((option) => option.name)).toEqual([
      "Discapacidad física",
      "Discapacidad visual",
      "Discapacidad auditiva",
      "Discapacidad intelectual",
      "Discapacidad sicosocial (mental)",
      "Sordoceguera",
      "Discapacidad múltiple",
      "Sin discapacidad",
    ]);
  });

  it("preserva valores historicos que no estan en el catalogo", () => {
    const options = buildDisabilityOptions("Discapacidad respiratoria");

    expect(options[0]).toEqual({
      id: "Discapacidad respiratoria",
      name: "Discapacidad respiratoria",
    });
  });

  it("no duplica una opcion ya conocida", () => {
    const options = buildDisabilityOptions("Sin discapacidad");

    expect(options).toHaveLength(8);
    expect(options[0]).toEqual({
      id: "Sin discapacidad",
      name: "Sin discapacidad",
    });
  });
});
