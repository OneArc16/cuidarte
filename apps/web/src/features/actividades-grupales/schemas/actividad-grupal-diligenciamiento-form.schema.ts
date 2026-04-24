import {
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalResponsibleDepartment,
  type SaveActividadGrupalDiligenciamiento,
  actividadGrupalResponsibleDepartmentSchema,
  saveActividadGrupalDiligenciamientoSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

export const actividadGrupalDiligenciamientoFormSchema = z.object({
  objectives: requiredTextSchema(4000),
  development: requiredTextSchema(10_000),
  conclusion: requiredTextSchema(4000),
  responsibleDepartment: z.union([actividadGrupalResponsibleDepartmentSchema, z.literal("")]),
  integranteIds: z.array(z.string().uuid()).min(1, "Selecciona minimo un integrante."),
  removedPhotoFileIds: z.array(z.string().uuid()).default([]),
  removePdfFile: z.boolean().default(false),
});

export type ActividadGrupalDiligenciamientoFormValues = {
  objectives: string;
  development: string;
  conclusion: string;
  responsibleDepartment: ActividadGrupalResponsibleDepartment | "";
  integranteIds: string[];
  removedPhotoFileIds: string[];
  removePdfFile: boolean;
};

export function createActividadGrupalDiligenciamientoFormValues(
  detail: ActividadGrupalDiligenciamientoDetail,
): ActividadGrupalDiligenciamientoFormValues {
  return {
    objectives: detail.objectives,
    development: detail.development,
    conclusion: detail.conclusion,
    responsibleDepartment: detail.responsibleDepartment ?? "",
    integranteIds: detail.integrantes.map((integrante) => integrante.id),
    removedPhotoFileIds: [],
    removePdfFile: false,
  };
}

export function toSaveActividadGrupalDiligenciamiento(
  values: ActividadGrupalDiligenciamientoFormValues,
): SaveActividadGrupalDiligenciamiento {
  return saveActividadGrupalDiligenciamientoSchema.parse({
    ...values,
    responsibleDepartment: values.responsibleDepartment,
  });
}
