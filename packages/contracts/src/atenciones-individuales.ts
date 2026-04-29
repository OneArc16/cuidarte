import { z } from "zod";

import { type UserRole, userRoleSchema } from "./auth.js";

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const nullableTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const trimmedValue = value.trim();

      return trimmedValue === "" ? null : trimmedValue;
    })
    .pipe(z.string().max(maxLength).nullable());

const nullableNumberSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, context) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        return value;
      }

      context.addIssue({ code: "custom", message: "Debe ser un numero valido." });
      return z.NEVER;
    }

    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return null;
    }

    const parsedValue = Number(trimmedValue);

    if (!Number.isFinite(parsedValue)) {
      context.addIssue({ code: "custom", message: "Debe ser un numero valido." });
      return z.NEVER;
    }

    return parsedValue;
  })
  .pipe(z.number().min(0).max(999_999).nullable());

const nullableIntegerSchema = nullableNumberSchema.pipe(
  z.number().int().min(0).max(999_999).nullable(),
);

const requiredIntegerSchema = z
  .union([z.number(), z.string()])
  .transform((value, context) => {
    const parsedValue = typeof value === "number" ? value : Number(value.trim());

    if (!Number.isInteger(parsedValue)) {
      context.addIssue({ code: "custom", message: "Debe ser un numero entero." });
      return z.NEVER;
    }

    return parsedValue;
  })
  .pipe(z.number().int().min(1).max(999_999));

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const atencionIndividualModalidadValues = [
  "intramural",
  "extramural_domiciliaria",
  "extramural_jornada_movil",
  "telemedicina",
] as const;

export const atencionIndividualTipoConsultaValues = [
  "primera_vez",
  "control",
  "urgencia",
  "otro",
] as const;

export const atencionIndividualFinalidadValues = [
  "resolutiva_atencion_general",
  "deteccion_alteraciones_adulto",
  "seguimiento",
] as const;

export const atencionIndividualCausaExternaValues = [
  "accidente_trabajo",
  "accidente_transito",
  "accidente_rabico",
  "accidente_ofidico",
  "otro_tipo_accidente",
  "evento_catastrofico",
  "lesion_agresion",
  "lesion_auto_infligida",
  "sospecha_maltrato_fisico",
  "sospecha_abuso_sexual",
  "sospecha_maltrato_emocional",
  "enfermedad_general",
  "enfermedad_laboral",
  "otra",
] as const;

export const atencionOrdenTipoValues = [
  "laboratorio",
  "medicamento",
  "incapacidad",
  "insumo",
] as const;

export const atencionDiagnosticoTipoValues = [
  "principal",
  "relacionado",
  "impresion_diagnostica",
] as const;

export const atencionIndividualHistoryEditorRoleValues = [
  "medico",
  "psicologo",
  "nutricionista",
  "enfermeria",
  "fisioterapeuta",
] as const satisfies readonly UserRole[];

export const atencionIndividualHistoryReaderRoleValues = [
  "admin",
  "director",
  "super_admin",
] as const satisfies readonly UserRole[];

export const atencionIndividualHistoryAccessValues = ["view", "edit"] as const;

export const atencionIndividualModalidadSchema = z.enum(atencionIndividualModalidadValues);
export const atencionIndividualTipoConsultaSchema = z.enum(atencionIndividualTipoConsultaValues);
export const atencionIndividualFinalidadSchema = z.enum(atencionIndividualFinalidadValues);
export const atencionIndividualCausaExternaSchema = z.enum(atencionIndividualCausaExternaValues);
export const atencionOrdenTipoSchema = z.enum(atencionOrdenTipoValues);
export const atencionDiagnosticoTipoSchema = z.enum(atencionDiagnosticoTipoValues);
export const atencionIndividualHistoryAccessSchema = z.enum(
  atencionIndividualHistoryAccessValues,
);

export const atencionIndividualAdultoResumenSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
  age: z.number().int().min(0),
  sex: z.string().min(1),
  eps: z.string().max(160).nullable(),
  healthRegime: z.string().max(40).nullable(),
});

export const atencionOrdenMedicaSchema = z.object({
  id: z.string().min(1).max(80),
  tipo: atencionOrdenTipoSchema,
  nombre: requiredTextSchema(180),
  cantidad: nullableIntegerSchema,
  dosis: nullableTextSchema(160),
  duracion: nullableTextSchema(120),
  indicaciones: nullableTextSchema(600),
});

export const atencionDiagnosticoSchema = z.object({
  id: z.string().min(1).max(80),
  codigoCie10: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,2})?$/, "Digite un codigo CIE-10 valido."),
  descripcion: requiredTextSchema(220),
  tipo: atencionDiagnosticoTipoSchema,
});

export const atencionIndividualSupportFileSchema = z.object({
  id: z.uuid(),
  originalName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().min(0),
  createdAt: z.string().min(1),
});

export const atencionIndividualCommandSchema = z.object({
  adultoMayorId: z.uuid(),
  attentionDate: dateSchema,
  modalidad: atencionIndividualModalidadSchema,
  tipoConsulta: atencionIndividualTipoConsultaSchema,
  nombreConsulta: requiredTextSchema(160),
  consecutive: requiredIntegerSchema,
  finalidad: atencionIndividualFinalidadSchema,
  causaExterna: atencionIndividualCausaExternaSchema,
  motivoConsulta: requiredTextSchema(1000),
  enfermedadActual: requiredTextSchema(3000),
  antecedentesPersonales: nullableTextSchema(3000),
  antecedentesFamiliares: nullableTextSchema(3000),
  tensionSistolica: nullableIntegerSchema,
  tensionDiastolica: nullableIntegerSchema,
  frecuenciaCardiaca: nullableIntegerSchema,
  frecuenciaRespiratoria: nullableIntegerSchema,
  temperatura: nullableNumberSchema,
  saturacionOxigeno: nullableIntegerSchema,
  pesoKg: nullableNumberSchema,
  tallaCm: nullableNumberSchema,
  imc: nullableNumberSchema,
  perimetroAbdominalCm: nullableNumberSchema,
  examenFisico: nullableTextSchema(4000),
  resultadosLaboratorios: nullableTextSchema(3000),
  resultadosProcedimientos: nullableTextSchema(3000),
  ordenesMedicas: z.array(atencionOrdenMedicaSchema).max(60),
  diagnosticos: z.array(atencionDiagnosticoSchema).min(1).max(20),
});

export const createAtencionIndividualRequestSchema = atencionIndividualCommandSchema;
export const updateAtencionIndividualRequestSchema = atencionIndividualCommandSchema.omit({
  adultoMayorId: true,
});
export const atencionIndividualMultipartPayloadSchema = z.object({
  payload: atencionIndividualCommandSchema,
});
export const updateAtencionIndividualMultipartPayloadSchema = z.object({
  payload: updateAtencionIndividualRequestSchema,
  removedSupportFileIds: z.array(z.uuid()).max(3).default([]),
});

export const atencionIndividualDetailSchema = atencionIndividualCommandSchema.extend({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  adultoMayor: atencionIndividualAdultoResumenSchema,
  createdByUserId: z.uuid(),
  updatedByUserId: z.uuid(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  supportFiles: z.array(atencionIndividualSupportFileSchema).max(3),
});

export const atencionIndividualHistoryProfessionalSchema = z.object({
  userId: z.uuid(),
  fullName: z.string().min(1).max(180),
  role: userRoleSchema,
});

export const atencionIndividualHistoryItemSchema = z.object({
  id: z.uuid(),
  adultoMayorId: z.uuid(),
  attentionDate: dateSchema,
  modalidad: atencionIndividualModalidadSchema,
  tipoConsulta: atencionIndividualTipoConsultaSchema,
  nombreConsulta: z.string().min(1).max(160),
  consecutive: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  professional: atencionIndividualHistoryProfessionalSchema,
  access: atencionIndividualHistoryAccessSchema,
});

export const atencionIndividualLookupResponseSchema = z.object({
  adultoMayor: atencionIndividualAdultoResumenSchema,
  suggestedConsecutive: z.number().int().min(1),
});

export const atencionIndividualHistoryResponseSchema = z.object({
  adultoMayor: atencionIndividualAdultoResumenSchema,
  atenciones: z.array(atencionIndividualHistoryItemSchema),
});

export const createAtencionIndividualResponseSchema = atencionIndividualDetailSchema;
export const updateAtencionIndividualResponseSchema = atencionIndividualDetailSchema;

export type AtencionIndividualModalidad = z.infer<typeof atencionIndividualModalidadSchema>;
export type AtencionIndividualTipoConsulta = z.infer<typeof atencionIndividualTipoConsultaSchema>;
export type AtencionIndividualFinalidad = z.infer<typeof atencionIndividualFinalidadSchema>;
export type AtencionIndividualCausaExterna = z.infer<typeof atencionIndividualCausaExternaSchema>;
export type AtencionOrdenTipo = z.infer<typeof atencionOrdenTipoSchema>;
export type AtencionDiagnosticoTipo = z.infer<typeof atencionDiagnosticoTipoSchema>;
export type AtencionIndividualHistoryAccess = z.infer<
  typeof atencionIndividualHistoryAccessSchema
>;
export type AtencionIndividualAdultoResumen = z.infer<typeof atencionIndividualAdultoResumenSchema>;
export type AtencionOrdenMedica = z.infer<typeof atencionOrdenMedicaSchema>;
export type AtencionDiagnostico = z.infer<typeof atencionDiagnosticoSchema>;
export type AtencionIndividualSupportFile = z.infer<typeof atencionIndividualSupportFileSchema>;
export type AtencionIndividualHistoryProfessional = z.infer<
  typeof atencionIndividualHistoryProfessionalSchema
>;
export type AtencionIndividualHistoryItem = z.infer<typeof atencionIndividualHistoryItemSchema>;
export type CreateAtencionIndividualRequest = z.infer<typeof createAtencionIndividualRequestSchema>;
export type UpdateAtencionIndividualRequest = z.infer<typeof updateAtencionIndividualRequestSchema>;
export type AtencionIndividualMultipartPayload = z.infer<
  typeof atencionIndividualMultipartPayloadSchema
>;
export type UpdateAtencionIndividualMultipartPayload = z.infer<
  typeof updateAtencionIndividualMultipartPayloadSchema
>;
export type AtencionIndividualDetail = z.infer<typeof atencionIndividualDetailSchema>;
export type AtencionIndividualLookupResponse = z.infer<
  typeof atencionIndividualLookupResponseSchema
>;
export type AtencionIndividualHistoryResponse = z.infer<
  typeof atencionIndividualHistoryResponseSchema
>;
