import {
  atencionEnfermeriaCareTypeValues,
  atencionEnfermeriaGlucometriaContextValues,
  createAtencionEnfermeriaRequestSchema,
  type AtencionEnfermeriaDetail,
  type AtencionEnfermeriaGlucometriaContext,
  type CreateAtencionEnfermeriaRequest,
  type UpdateAtencionEnfermeriaRequest,
  updateAtencionEnfermeriaRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { formatImcInput } from "@/features/atenciones-individuales/lib/imc";
import { getLocalDateInputValue } from "@/shared/lib/date-input";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha.");
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Selecciona la hora.");
const noteSchema = z.string().trim().min(1, "Escribe una nota de enfermeria.").max(4000);
const shortTextSchema = z.string().trim().max(1000);
const optionalNumberTextSchema = z
  .string()
  .max(20)
  .refine((value) => value.trim() === "" || Number.isFinite(Number(value.trim())), {
    message: "Debe ser un numero valido.",
  });

export const atencionesEnfermeriaFormSchema = z
  .object({
    attentionDate: dateSchema,
    attentionTime: timeSchema,
    careType: z.enum(atencionEnfermeriaCareTypeValues),
    reason: shortTextSchema,
    tensionSistolica: optionalNumberTextSchema,
    tensionDiastolica: optionalNumberTextSchema,
    frecuenciaCardiaca: optionalNumberTextSchema,
    frecuenciaRespiratoria: optionalNumberTextSchema,
    temperatura: optionalNumberTextSchema,
    saturacionOxigeno: optionalNumberTextSchema,
    pesoKg: optionalNumberTextSchema,
    tallaCm: optionalNumberTextSchema,
    perimetroAbdominalCm: optionalNumberTextSchema,
    glucometriaMgDl: optionalNumberTextSchema,
    glucometriaContext: z.union([z.enum(atencionEnfermeriaGlucometriaContextValues), z.literal("")]),
    nursingNote: noteSchema,
  })
  .superRefine((value, context) => {
    const hasMeasurement = [
      value.tensionSistolica,
      value.tensionDiastolica,
      value.frecuenciaCardiaca,
      value.frecuenciaRespiratoria,
      value.temperatura,
      value.saturacionOxigeno,
      value.pesoKg,
      value.tallaCm,
      value.perimetroAbdominalCm,
      value.glucometriaMgDl,
    ].some((measurement) => measurement.trim() !== "");

    if (!hasMeasurement) {
      context.addIssue({
        code: "custom",
        path: ["tensionSistolica"],
        message: "Registra al menos una medicion o una glucometria.",
      });
    }

    if (value.glucometriaMgDl.trim() !== "" && value.glucometriaContext === "") {
      context.addIssue({
        code: "custom",
        path: ["glucometriaContext"],
        message: "El contexto es obligatorio cuando registras glucometria.",
      });
    }

    if (value.glucometriaMgDl.trim() === "" && value.glucometriaContext !== "") {
      context.addIssue({
        code: "custom",
        path: ["glucometriaMgDl"],
        message: "La glucometria es obligatoria cuando registras contexto.",
      });
    }
  });

export type AtencionesEnfermeriaFormValues = z.infer<typeof atencionesEnfermeriaFormSchema>;

export function createDefaultAtencionesEnfermeriaFormValues(): AtencionesEnfermeriaFormValues {
  const now = new Date();

  return {
    attentionDate: getLocalDateInputValue(now),
    attentionTime: now.toTimeString().slice(0, 5),
    careType: "control_signos_vitales",
    reason: "",
    tensionSistolica: "",
    tensionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    saturacionOxigeno: "",
    pesoKg: "",
    tallaCm: "",
    perimetroAbdominalCm: "",
    glucometriaMgDl: "",
    glucometriaContext: "",
    nursingNote: "",
  };
}

export function toAtencionesEnfermeriaFormValues(
  detail: AtencionEnfermeriaDetail,
): AtencionesEnfermeriaFormValues {
  return {
    attentionDate: detail.attentionDate,
    attentionTime: detail.attentionTime,
    careType: detail.careType,
    reason: detail.reason ?? "",
    tensionSistolica: numberToText(detail.tensionSistolica),
    tensionDiastolica: numberToText(detail.tensionDiastolica),
    frecuenciaCardiaca: numberToText(detail.frecuenciaCardiaca),
    frecuenciaRespiratoria: numberToText(detail.frecuenciaRespiratoria),
    temperatura: numberToText(detail.temperatura),
    saturacionOxigeno: numberToText(detail.saturacionOxigeno),
    pesoKg: numberToText(detail.pesoKg),
    tallaCm: numberToText(detail.tallaCm),
    perimetroAbdominalCm: numberToText(detail.perimetroAbdominalCm),
    glucometriaMgDl: numberToText(detail.glucometriaMgDl),
    glucometriaContext: detail.glucometriaContext ?? "",
    nursingNote: detail.nursingNote,
  };
}

export function toCreateAtencionEnfermeriaRequest(
  adultoMayorId: string,
  values: AtencionesEnfermeriaFormValues,
): CreateAtencionEnfermeriaRequest {
  return createAtencionEnfermeriaRequestSchema.parse(buildRequestPayload(adultoMayorId, values));
}

export function toUpdateAtencionEnfermeriaRequest(
  version: number,
  values: AtencionesEnfermeriaFormValues,
): UpdateAtencionEnfermeriaRequest {
  return updateAtencionEnfermeriaRequestSchema.parse({
    ...buildRequestPayload(undefined, values),
    version,
  });
}

export function getAtencionesEnfermeriaImc(values: Pick<AtencionesEnfermeriaFormValues, "pesoKg" | "tallaCm">): string {
  return formatImcInput(values.pesoKg, values.tallaCm);
}

function buildRequestPayload(
  adultoMayorId: string | undefined,
  values: AtencionesEnfermeriaFormValues,
) {
  return {
    ...(adultoMayorId === undefined ? {} : { adultoMayorId }),
    attentionDate: values.attentionDate,
    attentionTime: values.attentionTime,
    careType: values.careType,
    reason: textToNull(values.reason),
    tensionSistolica: parseOptionalInteger(values.tensionSistolica),
    tensionDiastolica: parseOptionalInteger(values.tensionDiastolica),
    frecuenciaCardiaca: parseOptionalInteger(values.frecuenciaCardiaca),
    frecuenciaRespiratoria: parseOptionalInteger(values.frecuenciaRespiratoria),
    temperatura: parseOptionalNumber(values.temperatura),
    saturacionOxigeno: parseOptionalInteger(values.saturacionOxigeno),
    pesoKg: parseOptionalNumber(values.pesoKg),
    tallaCm: parseOptionalNumber(values.tallaCm),
    perimetroAbdominalCm: parseOptionalNumber(values.perimetroAbdominalCm),
    glucometriaMgDl: parseOptionalInteger(values.glucometriaMgDl),
    glucometriaContext: values.glucometriaContext === "" ? null : values.glucometriaContext,
    nursingNote: values.nursingNote,
  };
}

function numberToText(value: number | null): string {
  return value === null ? "" : String(value);
}

function textToNull(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed === "") {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalInteger(value: string): number | null {
  const parsed = parseOptionalNumber(value);

  return parsed === null ? null : Math.trunc(parsed);
}
