import {
  type AtencionIndividualDetail,
  type AtencionOrdenTipo,
  type CreateAtencionIndividualRequest,
  type UpdateAtencionIndividualRequest,
  atencionDiagnosticoTipoValues,
  atencionIndividualCausaExternaValues,
  atencionIndividualFinalidadValues,
  atencionIndividualModalidadValues,
  atencionIndividualTipoConsultaValues,
  atencionOrdenTipoValues,
} from "@cuidarte/contracts";
import { z } from "zod";

import { calculateImc } from "../lib/imc";
import { normalizeCie10Code } from "@/shared/lib/cie10-code";

const textOrEmptySchema = z.string().max(4000);
const requiredTextSchema = (message: string) => z.string().trim().min(1, message).max(4000);
const optionalNumberTextSchema = z
  .string()
  .max(20)
  .refine((value) => value.trim() === "" || Number.isFinite(Number(value.trim())), {
    message: "Debe ser un numero valido.",
  });
const requiredIntegerTextSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]*$/, "Debe ser un numero entero mayor a cero.");

export const atencionOrdenFormSchema = z.object({
  id: z.string().min(1),
  tipo: z.enum(atencionOrdenTipoValues),
  nombre: requiredTextSchema("Digite el nombre de la orden."),
  cantidad: optionalNumberTextSchema,
  dosis: z.string().max(160),
  duracion: z.string().max(120),
  indicaciones: z.string().max(600),
});

export const atencionDiagnosticoFormSchema = z.object({
  id: z.string().min(1),
  codigoCie10: z.string().transform(normalizeCie10Code).pipe(
    z
      .string()
      .regex(/^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,2})?$/, "Digite un codigo CIE-10 valido."),
  ),
  descripcion: requiredTextSchema("Digite la descripcion del diagnostico."),
  tipo: z.enum(atencionDiagnosticoTipoValues),
});

export const atencionIndividualFormSchema = z.object({
  attentionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Selecciona la fecha."),
  modalidad: z.enum(atencionIndividualModalidadValues),
  tipoConsulta: z.enum(atencionIndividualTipoConsultaValues),
  nombreConsulta: requiredTextSchema("Digite el nombre de la consulta."),
  consecutive: requiredIntegerTextSchema,
  finalidad: z.enum(atencionIndividualFinalidadValues),
  causaExterna: z.enum(atencionIndividualCausaExternaValues),
  motivoConsulta: requiredTextSchema("Digite el motivo de consulta."),
  enfermedadActual: requiredTextSchema("Digite la enfermedad actual."),
  antecedentesPersonales: textOrEmptySchema,
  antecedentesFamiliares: textOrEmptySchema,
  tensionSistolica: optionalNumberTextSchema,
  tensionDiastolica: optionalNumberTextSchema,
  frecuenciaCardiaca: optionalNumberTextSchema,
  frecuenciaRespiratoria: optionalNumberTextSchema,
  temperatura: optionalNumberTextSchema,
  saturacionOxigeno: optionalNumberTextSchema,
  pesoKg: optionalNumberTextSchema,
  tallaCm: optionalNumberTextSchema,
  imc: optionalNumberTextSchema,
  perimetroAbdominalCm: optionalNumberTextSchema,
  examenFisico: textOrEmptySchema,
  resultadosLaboratorios: textOrEmptySchema,
  resultadosProcedimientos: textOrEmptySchema,
  ordenesMedicas: z.array(atencionOrdenFormSchema),
  diagnosticos: z.array(atencionDiagnosticoFormSchema).min(1, "Agrega al menos un diagnostico."),
});

export type AtencionIndividualFormValues = z.infer<typeof atencionIndividualFormSchema>;
export type AtencionOrdenFormValues = z.infer<typeof atencionOrdenFormSchema>;
export type AtencionDiagnosticoFormValues = z.infer<typeof atencionDiagnosticoFormSchema>;

export function createDefaultAtencionIndividualFormValues(
  suggestedConsecutive: number,
): AtencionIndividualFormValues {
  return {
    attentionDate: new Date().toISOString().slice(0, 10),
    modalidad: "intramural",
    tipoConsulta: "primera_vez",
    nombreConsulta: "Atencion individual",
    consecutive: String(suggestedConsecutive),
    finalidad: "resolutiva_atencion_general",
    causaExterna: "enfermedad_general",
    motivoConsulta: "",
    enfermedadActual: "",
    antecedentesPersonales: "",
    antecedentesFamiliares: "",
    tensionSistolica: "",
    tensionDiastolica: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    saturacionOxigeno: "",
    pesoKg: "",
    tallaCm: "",
    imc: "",
    perimetroAbdominalCm: "",
    examenFisico: "",
    resultadosLaboratorios: "",
    resultadosProcedimientos: "",
    ordenesMedicas: [],
    diagnosticos: [createDefaultDiagnostico()],
  };
}

export function toAtencionIndividualFormValues(
  detail: AtencionIndividualDetail,
): AtencionIndividualFormValues {
  return {
    attentionDate: detail.attentionDate,
    modalidad: detail.modalidad,
    tipoConsulta: detail.tipoConsulta,
    nombreConsulta: detail.nombreConsulta,
    consecutive: String(detail.consecutive),
    finalidad: detail.finalidad,
    causaExterna: detail.causaExterna,
    motivoConsulta: detail.motivoConsulta,
    enfermedadActual: detail.enfermedadActual,
    antecedentesPersonales: detail.antecedentesPersonales ?? "",
    antecedentesFamiliares: detail.antecedentesFamiliares ?? "",
    tensionSistolica: numberToText(detail.tensionSistolica),
    tensionDiastolica: numberToText(detail.tensionDiastolica),
    frecuenciaCardiaca: numberToText(detail.frecuenciaCardiaca),
    frecuenciaRespiratoria: numberToText(detail.frecuenciaRespiratoria),
    temperatura: numberToText(detail.temperatura),
    saturacionOxigeno: numberToText(detail.saturacionOxigeno),
    pesoKg: numberToText(detail.pesoKg),
    tallaCm: numberToText(detail.tallaCm),
    imc: numberToText(detail.imc),
    perimetroAbdominalCm: numberToText(detail.perimetroAbdominalCm),
    examenFisico: detail.examenFisico ?? "",
    resultadosLaboratorios: detail.resultadosLaboratorios ?? "",
    resultadosProcedimientos: detail.resultadosProcedimientos ?? "",
    ordenesMedicas: detail.ordenesMedicas.map((orden) => ({
      id: orden.id,
      tipo: orden.tipo,
      nombre: orden.nombre,
      cantidad: numberToText(orden.cantidad),
      dosis: orden.dosis ?? "",
      duracion: orden.duracion ?? "",
      indicaciones: orden.indicaciones ?? "",
    })),
    diagnosticos: detail.diagnosticos.map((diagnostico) => ({
      id: diagnostico.id,
      codigoCie10: normalizeCie10Code(diagnostico.codigoCie10),
      descripcion: diagnostico.descripcion,
      tipo: diagnostico.tipo,
    })),
  };
}

export function toCreateAtencionIndividualRequest(
  adultoMayorId: string,
  values: AtencionIndividualFormValues,
): CreateAtencionIndividualRequest {
  return {
    adultoMayorId,
    ...toUpdateAtencionIndividualRequest(values),
  };
}

export function toUpdateAtencionIndividualRequest(
  values: AtencionIndividualFormValues,
): UpdateAtencionIndividualRequest {
  const pesoKg = parseOptionalNumber(values.pesoKg);
  const tallaCm = parseOptionalNumber(values.tallaCm);

  return {
    attentionDate: values.attentionDate,
    modalidad: values.modalidad,
    tipoConsulta: values.tipoConsulta,
    nombreConsulta: values.nombreConsulta,
    consecutive: parseRequiredInteger(values.consecutive),
    finalidad: values.finalidad,
    causaExterna: values.causaExterna,
    motivoConsulta: values.motivoConsulta,
    enfermedadActual: values.enfermedadActual,
    antecedentesPersonales: textOrNull(values.antecedentesPersonales),
    antecedentesFamiliares: textOrNull(values.antecedentesFamiliares),
    tensionSistolica: parseOptionalInteger(values.tensionSistolica),
    tensionDiastolica: parseOptionalInteger(values.tensionDiastolica),
    frecuenciaCardiaca: parseOptionalInteger(values.frecuenciaCardiaca),
    frecuenciaRespiratoria: parseOptionalInteger(values.frecuenciaRespiratoria),
    temperatura: parseOptionalNumber(values.temperatura),
    saturacionOxigeno: parseOptionalInteger(values.saturacionOxigeno),
    pesoKg,
    tallaCm,
    imc: calculateImc(values.pesoKg, values.tallaCm),
    perimetroAbdominalCm: parseOptionalNumber(values.perimetroAbdominalCm),
    examenFisico: textOrNull(values.examenFisico),
    resultadosLaboratorios: textOrNull(values.resultadosLaboratorios),
    resultadosProcedimientos: textOrNull(values.resultadosProcedimientos),
    ordenesMedicas: values.ordenesMedicas.map((orden) => ({
      id: orden.id,
      tipo: orden.tipo,
      nombre: orden.nombre,
      cantidad: parseOptionalInteger(orden.cantidad),
      dosis: textOrNull(orden.dosis),
      duracion: textOrNull(orden.duracion),
      indicaciones: textOrNull(orden.indicaciones),
    })),
    diagnosticos: values.diagnosticos.map((diagnostico) => ({
      id: diagnostico.id,
      codigoCie10: normalizeCie10Code(diagnostico.codigoCie10),
      descripcion: diagnostico.descripcion,
      tipo: diagnostico.tipo,
    })),
  };
}

export function createDefaultOrden(
  tipo: AtencionOrdenTipo = "laboratorio",
): AtencionOrdenFormValues {
  return {
    id: crypto.randomUUID(),
    tipo,
    nombre: "",
    cantidad: "",
    dosis: "",
    duracion: "",
    indicaciones: "",
  };
}

export function createDefaultDiagnostico(): AtencionDiagnosticoFormValues {
  return {
    id: crypto.randomUUID(),
    codigoCie10: "",
    descripcion: "",
    tipo: "principal",
  };
}

function textOrNull(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}

function numberToText(value: number | null): string {
  return value === null ? "" : String(value);
}

function parseOptionalNumber(value: string): number | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : Number(trimmedValue);
}

function parseOptionalInteger(value: string): number | null {
  const parsedValue = parseOptionalNumber(value);

  return parsedValue === null ? null : Math.trunc(parsedValue);
}

function parseRequiredInteger(value: string): number {
  return Math.trunc(Number(value.trim()));
}
