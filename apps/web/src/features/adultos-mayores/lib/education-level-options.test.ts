import { describe, expect, it } from "vitest";

import { buildEducationLevelOptions, EDUCATION_LEVEL_OPTIONS } from "./education-level-options";

describe("buildEducationLevelOptions", () => {
  it("expone el catalogo base de niveles academicos", () => {
    expect(EDUCATION_LEVEL_OPTIONS).toHaveLength(13);
    expect(EDUCATION_LEVEL_OPTIONS.map((option) => option.name)).toEqual([
      "Preescolar",
      "Básica Primaria",
      "Básica Secundaria",
      "Media Académica",
      "Media Técnica",
      "Normalista",
      "Técnico Profesional",
      "Tecnológica",
      "Profesional",
      "Especialización",
      "Maestría",
      "Doctorado",
      "Ninguno",
    ]);
  });

  it("preserva valores historicos que no estan en el catalogo", () => {
    const options = buildEducationLevelOptions("Primaria completa");

    expect(options[0]).toEqual({
      id: "Primaria completa",
      name: "Primaria completa",
    });
  });
});
