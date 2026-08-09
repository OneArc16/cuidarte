import { describe, expect, it } from "vitest";

import { buildPopulationGroupOptions, POPULATION_GROUP_OPTIONS } from "./population-group-options";

describe("buildPopulationGroupOptions", () => {
  it("expone el catalogo base de grupos poblacionales", () => {
    expect(POPULATION_GROUP_OPTIONS).toHaveLength(6);
    expect(POPULATION_GROUP_OPTIONS.map((option) => option.name)).toEqual([
      "Indigena",
      "ROM (gitano)",
      "Raizal (archipiélago de San Andrés y Providencia)",
      "Palenquero de San Basilio",
      "Negro(a), Mulato(a), Afrocolombiano(a) o Afro",
      "Ninguna de las anteriores",
    ]);
  });

  it("preserva valores historicos que no estan en el catalogo", () => {
    const options = buildPopulationGroupOptions("Persona mayor");

    expect(options[0]).toEqual({
      id: "Persona mayor",
      name: "Persona mayor",
    });
  });

  it("no duplica una opcion ya conocida", () => {
    const options = buildPopulationGroupOptions("Indigena");

    expect(options).toHaveLength(6);
    expect(options[0]).toEqual({
      id: "Indigena",
      name: "Indigena",
    });
  });
});
