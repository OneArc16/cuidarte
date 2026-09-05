import { describe, expect, it } from "vitest";

import {
  HEALTH_REGIME_OPTIONS,
  buildHealthRegimeOptions,
  resolveHealthRegimeFormValue,
} from "./health-regime-options";

describe("healthRegimeOptions", () => {
  it("expone el catalogo visible de regimenes", () => {
    expect(HEALTH_REGIME_OPTIONS).toHaveLength(12);
    expect(HEALTH_REGIME_OPTIONS.map((option) => option.id)).toEqual([
      "special",
      "uninsured",
      "subsidized",
      "contributory-additional",
      "contributory-beneficiary",
      "contributory",
      "exception",
      "arl-protected",
      "soat-protected",
      "voluntary-health-plans",
      "particular",
      "prisoners-covered-by-national-health-fund",
    ]);
    expect(HEALTH_REGIME_OPTIONS.map((option) => option.name)).toEqual([
      "Especial o Excepción cotizante",
      "No afiliado",
      "Subsidiado",
      "Contributivo adicional",
      "Contributivo beneficiario",
      "Contributivo cotizante",
      "Especial o Excepción beneficiario",
      "Tomador / Amparado ARL",
      "Tomador / Amparado SOAT",
      "Tomador / Amparado Planes voluntarios de salud",
      "Particular",
      "Personas privadas de la libertad a cargo del Fondo Nacional de Salud",
    ]);
  });

  it("mapea los valores heredados al valor estable del formulario", () => {
    expect(resolveHealthRegimeFormValue("Subsidiado")).toBe("subsidized");
    expect(resolveHealthRegimeFormValue("Ninguno")).toBe("unknown");
  });

  it("preserva valores historicos que no estan en el catalogo", () => {
    const options = buildHealthRegimeOptions("Cobertura especial antigua");

    expect(options[0]).toEqual({
      id: "Cobertura especial antigua",
      name: "Cobertura especial antigua",
    });
  });
});
