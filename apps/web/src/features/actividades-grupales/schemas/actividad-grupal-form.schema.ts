import {
  type ActividadGrupalEditDetail,
  type CreateActividadGrupalRequest,
  type UpdateActividadGrupalRequest,
  actividadGrupalOrganizerSchema,
  actividadGrupalTypeSchema,
  createActividadGrupalRequestSchema,
  updateActividadGrupalRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

export const actividadGrupalFormSchema = z
  .object({
    tenantId: z.string().trim(),
    activityName: requiredTextSchema(160),
    activityType: actividadGrupalTypeSchema,
    activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    organizer: actividadGrupalOrganizerSchema,
    employeeIds: z.array(z.string().uuid()).min(1),
  })
  .superRefine((value, context) => {
    if (value.endTime <= value.startTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "La hora final debe ser posterior a la hora de inicio.",
      });
    }
  });

export type ActividadGrupalFormValues = Omit<CreateActividadGrupalRequest, "tenantId"> & {
  tenantId: string;
};

export function createDefaultActividadGrupalFormValues(): ActividadGrupalFormValues {
  return {
    tenantId: "",
    activityName: "",
    activityType: "centro_vida",
    activityDate: "",
    startTime: "",
    endTime: "",
    organizer: "director",
    employeeIds: [],
  };
}

export function toCreateActividadGrupalRequest(
  values: ActividadGrupalFormValues,
): CreateActividadGrupalRequest {
  return createActividadGrupalRequestSchema.parse({
    ...values,
    tenantId: values.tenantId.trim() === "" ? null : values.tenantId,
  });
}

export function toUpdateActividadGrupalRequest(
  values: ActividadGrupalFormValues,
): UpdateActividadGrupalRequest {
  return updateActividadGrupalRequestSchema.parse({
    activityName: values.activityName,
    activityType: values.activityType,
    activityDate: values.activityDate,
    startTime: values.startTime,
    endTime: values.endTime,
    organizer: values.organizer,
    employeeIds: values.employeeIds,
  });
}

export function toActividadGrupalFormValues(
  detail: ActividadGrupalEditDetail,
): ActividadGrupalFormValues {
  return {
    tenantId: detail.tenantId,
    activityName: detail.activityName,
    activityType: detail.activityType,
    activityDate: detail.activityDate,
    startTime: detail.startTime,
    endTime: detail.endTime,
    organizer: detail.organizer,
    employeeIds: detail.employeeIds,
  };
}
