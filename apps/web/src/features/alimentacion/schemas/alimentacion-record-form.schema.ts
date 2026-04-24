import {
  type AlimentacionDetail,
  type UpdateAlimentacionRequest,
  alimentacionOrganizerSchema,
  alimentacionStatusSchema,
  updateAlimentacionRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

export const alimentacionRecordFormSchema = z.object({
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  organizer: alimentacionOrganizerSchema,
  refrigerio1: alimentacionStatusSchema,
  almuerzo: alimentacionStatusSchema,
  refrigerio2: alimentacionStatusSchema,
  auxilioTransporte: alimentacionStatusSchema,
});

export type AlimentacionRecordFormValues = UpdateAlimentacionRequest;

export function createDefaultAlimentacionRecordFormValues(
  record: AlimentacionDetail,
): AlimentacionRecordFormValues {
  return {
    deliveryDate: record.deliveryDate,
    organizer: record.organizer,
    refrigerio1: record.refrigerio1,
    almuerzo: record.almuerzo,
    refrigerio2: record.refrigerio2,
    auxilioTransporte: record.auxilioTransporte,
  };
}

export function toUpdateAlimentacionRequest(
  values: AlimentacionRecordFormValues,
): UpdateAlimentacionRequest {
  return updateAlimentacionRequestSchema.parse(values);
}
