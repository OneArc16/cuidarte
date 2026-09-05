import { describe, expect, it } from "vitest";

import {
  actividadGrupalDiligenciamientoFormSchema,
  toSaveActividadGrupalDiligenciamiento,
  type ActividadGrupalDiligenciamientoFormValues,
} from "./actividad-grupal-diligenciamiento-form.schema";

describe("actividadGrupalDiligenciamientoFormSchema", () => {
  it("allows long objectives, development and conclusion texts", () => {
    const longText = "Texto amplio de la sesion. ".repeat(1_200);
    const values = createValues({
      objectives: longText,
      development: longText,
      conclusion: longText,
    });

    const result = actividadGrupalDiligenciamientoFormSchema.safeParse(values);
    const payload = toSaveActividadGrupalDiligenciamiento(values);

    expect(result.success).toBe(true);
    expect(payload.objectives).toBe(longText.trim());
    expect(payload.development).toBe(longText.trim());
    expect(payload.conclusion).toBe(longText.trim());
  });

  it("keeps objectives, development and conclusion required", () => {
    const result = actividadGrupalDiligenciamientoFormSchema.safeParse(
      createValues({
        objectives: "   ",
        development: "",
        conclusion: "",
      }),
    );

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors).toMatchObject({
      objectives: ["Ingresa los objetivos de la sesión."],
      development: ["Ingresa el desarrollo de la sesión."],
      conclusion: ["Ingresa la conclusión de la sesión."],
    });
  });

  it("allows saving without integrantes", () => {
    const values = createValues({ integranteIds: [] });

    const result = actividadGrupalDiligenciamientoFormSchema.safeParse(values);
    const payload = toSaveActividadGrupalDiligenciamiento(values);

    expect(result.success).toBe(true);
    expect(payload.integranteIds).toEqual([]);
  });
});

function createValues(
  overrides: Partial<ActividadGrupalDiligenciamientoFormValues> = {},
): ActividadGrupalDiligenciamientoFormValues {
  return {
    objectives: "Objetivos",
    development: "Desarrollo",
    conclusion: "Conclusion",
    responsibleDepartment: "direccion",
    integranteIds: ["11111111-1111-4111-8111-111111111111"],
    removedPhotoFileIds: [],
    removePdfFile: false,
    ...overrides,
  };
}
