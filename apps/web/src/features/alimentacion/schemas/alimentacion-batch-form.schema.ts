import {
  type AlimentacionAdultoOption,
  type AlimentacionOrganizer,
  type AlimentacionStatus,
  type CreateAlimentacionBatchRequest,
  alimentacionOrganizerSchema,
  createAlimentacionBatchRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { getTodayDateInputValue } from "../lib/alimentacion-formatters";

export const alimentacionBatchFormSchema = z.object({
  tenantId: z.string().trim(),
  deliveryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  organizer: alimentacionOrganizerSchema,
});

export type AlimentacionBatchFormValues = {
  tenantId: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
};

export type AlimentacionBatchRowValues = {
  adultoMayor: AlimentacionAdultoOption;
  refrigerio1: AlimentacionStatus | "";
  almuerzo: AlimentacionStatus | "";
  refrigerio2: AlimentacionStatus | "";
  auxilioTransporte: AlimentacionStatus | "";
};

export function createDefaultAlimentacionBatchFormValues(): AlimentacionBatchFormValues {
  return {
    tenantId: "",
    deliveryDate: getTodayDateInputValue(),
    organizer: "director",
  };
}

export function createDefaultAlimentacionBatchRow(
  adultoMayor: AlimentacionAdultoOption,
): AlimentacionBatchRowValues {
  return {
    adultoMayor,
    refrigerio1: "",
    almuerzo: "",
    refrigerio2: "",
    auxilioTransporte: "",
  };
}

export function isAlimentacionBatchRowComplete(
  row: AlimentacionBatchRowValues,
): row is AlimentacionBatchRowValues & {
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
} {
  return (
    row.refrigerio1 !== "" &&
    row.almuerzo !== "" &&
    row.refrigerio2 !== "" &&
    row.auxilioTransporte !== ""
  );
}

export function toCreateAlimentacionBatchRequest(
  values: AlimentacionBatchFormValues,
  rows: Array<
    AlimentacionBatchRowValues & {
      refrigerio1: AlimentacionStatus;
      almuerzo: AlimentacionStatus;
      refrigerio2: AlimentacionStatus;
      auxilioTransporte: AlimentacionStatus;
    }
  >,
): CreateAlimentacionBatchRequest {
  return createAlimentacionBatchRequestSchema.parse({
    tenantId: values.tenantId.trim() === "" ? null : values.tenantId,
    deliveryDate: values.deliveryDate,
    organizer: values.organizer,
    registros: rows.map((row) => ({
      adultoMayorId: row.adultoMayor.id,
      refrigerio1: row.refrigerio1,
      almuerzo: row.almuerzo,
      refrigerio2: row.refrigerio2,
      auxilioTransporte: row.auxilioTransporte,
    })),
  });
}
