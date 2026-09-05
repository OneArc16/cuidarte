import {
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalResponsibleDepartment,
  type SaveActividadGrupalDiligenciamiento,
  actividadGrupalResponsibleDepartmentSchema,
  saveActividadGrupalDiligenciamientoSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

const requiredLongTextSchema = (message: string) => z.string().trim().min(1, message);

export const actividadGrupalDiligenciamientoFormSchema = z.object({
  objectives: requiredLongTextSchema("Ingresa los objetivos de la sesión."),
  development: requiredLongTextSchema("Ingresa el desarrollo de la sesión."),
  conclusion: requiredLongTextSchema("Ingresa la conclusión de la sesión."),
  responsibleDepartment: z.union([actividadGrupalResponsibleDepartmentSchema, z.literal("")]),
  integranteIds: z.array(z.string().uuid()),
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
