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

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const nullableSearchSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.string().max(120).nullable());

const nullableUuidSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.uuid().nullable());

const nullableDateSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(dateSchema.nullable());

export const atencionEnfermeriaCareTypeValues = [
  "control_signos_vitales",
  "seguimiento",
  "procedimiento",
  "otro",
] as const;

export const atencionEnfermeriaGlucometriaContextValues = [
  "ayunas",
  "antes_de_comida",
  "despues_de_comida",
  "aleatoria",
] as const;

export const atencionEnfermeriaHistoryAccessValues = ["view", "edit"] as const;

export const atencionEnfermeriaCareTypeSchema = z.enum(atencionEnfermeriaCareTypeValues);
export const atencionEnfermeriaGlucometriaContextSchema = z.enum(
  atencionEnfermeriaGlucometriaContextValues,
);
export const atencionEnfermeriaHistoryAccessSchema = z.enum(atencionEnfermeriaHistoryAccessValues);

export const atencionEnfermeriaModuleRoleValues = [
  "enfermeria",
  "admin",
  "auditor",
  "director",
  "super_admin",
] as const satisfies readonly UserRole[];

export const atencionEnfermeriaCrossReadRoleValues = [
  ...atencionEnfermeriaModuleRoleValues,
  "medico",
] as const satisfies readonly UserRole[];

export const atencionEnfermeriaAdultoResumenSchema = z.object({
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

export const atencionEnfermeriaProfessionalSchema = z.object({
  userId: z.uuid(),
  fullName: z.string().min(1).max(180),
  role: userRoleSchema,
});

export const atencionEnfermeriaListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  tenantId: nullableUuidSchema.optional().default(null),
  adultoMayorId: nullableUuidSchema.optional().default(null),
  documentNumber: nullableSearchSchema.optional().default(null),
  professionalUserId: nullableUuidSchema.optional().default(null),
  attentionDate: nullableDateSchema.optional().default(null),
});

export const atencionEnfermeriaLookupResponseSchema = z.object({
  adultoMayor: atencionEnfermeriaAdultoResumenSchema,
});

export const atencionEnfermeriaVitalSignsSchema = z.object({
  tensionSistolica: nullableIntegerSchema,
  tensionDiastolica: nullableIntegerSchema,
  frecuenciaCardiaca: nullableIntegerSchema,
  frecuenciaRespiratoria: nullableIntegerSchema,
  temperatura: nullableNumberSchema,
  saturacionOxigeno: nullableIntegerSchema,
  pesoKg: nullableNumberSchema,
  tallaCm: nullableNumberSchema,
  perimetroAbdominalCm: nullableNumberSchema,
  glucometriaMgDl: nullableIntegerSchema.pipe(z.number().int().min(20).max(600).nullable()),
  glucometriaContext: z
    .union([atencionEnfermeriaGlucometriaContextSchema, z.literal(""), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      return value;
    })
    .pipe(atencionEnfermeriaGlucometriaContextSchema.nullable()),
});

const buildAtencionEnfermeriaCommandBaseSchema = () =>
  z
    .object({
      adultoMayorId: z.uuid(),
      attentionDate: dateSchema,
      attentionTime: timeSchema,
      careType: atencionEnfermeriaCareTypeSchema,
      reason: nullableTextSchema(1000),
      nursingNote: requiredTextSchema(4000),
    })
    .extend(atencionEnfermeriaVitalSignsSchema.shape);

const refineAtencionEnfermeriaCommand = <T extends z.ZodObject<z.ZodRawShape>>(schema: T) =>
  schema.superRefine((value, context) => {
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
    ].some((measurement) => measurement !== null);

    if (!hasMeasurement) {
      context.addIssue({
        code: "custom",
        path: ["tensionSistolica"],
        message: "Registra al menos una medicion o una glucometria.",
      });
    }

    if (value.glucometriaMgDl !== null && value.glucometriaContext === null) {
      context.addIssue({
        code: "custom",
        path: ["glucometriaContext"],
        message: "El contexto es obligatorio cuando registras glucometria.",
      });
    }

    if (value.glucometriaMgDl === null && value.glucometriaContext !== null) {
      context.addIssue({
        code: "custom",
        path: ["glucometriaMgDl"],
        message: "La glucometria es obligatoria cuando registras contexto.",
      });
    }
  });

export const atencionEnfermeriaCommandSchema = refineAtencionEnfermeriaCommand(
  buildAtencionEnfermeriaCommandBaseSchema(),
);

export const createAtencionEnfermeriaRequestSchema = atencionEnfermeriaCommandSchema;
export const updateAtencionEnfermeriaRequestSchema = refineAtencionEnfermeriaCommand(
  buildAtencionEnfermeriaCommandBaseSchema()
    .omit({
      adultoMayorId: true,
    })
    .extend({
      version: z.number().int().min(1),
    }),
);

export const atencionEnfermeriaListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  adultoMayor: atencionEnfermeriaAdultoResumenSchema,
  attentionDate: dateSchema,
  attentionTime: timeSchema,
  careType: atencionEnfermeriaCareTypeSchema,
  reason: z.string().max(1000).nullable(),
  glucometriaMgDl: z.number().int().min(20).max(600).nullable(),
  glucometriaContext: atencionEnfermeriaGlucometriaContextSchema.nullable(),
  access: atencionEnfermeriaHistoryAccessSchema,
  professional: atencionEnfermeriaProfessionalSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const atencionEnfermeriaDetailSchema = refineAtencionEnfermeriaCommand(
  buildAtencionEnfermeriaCommandBaseSchema().extend({
    id: z.uuid(),
    tenantId: z.uuid(),
    tenantName: z.string().min(1),
    adultoMayor: atencionEnfermeriaAdultoResumenSchema,
    imc: z.number().finite().nullable(),
    access: atencionEnfermeriaHistoryAccessSchema,
    professional: atencionEnfermeriaProfessionalSchema,
    createdByUserId: z.uuid(),
    updatedByUserId: z.uuid(),
    version: z.number().int().min(1),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  }),
);

export const atencionEnfermeriaHistoryItemSchema = atencionEnfermeriaListItemSchema;

export const atencionEnfermeriaListResponseSchema = z.object({
  atencionesEnfermeria: z.array(atencionEnfermeriaListItemSchema),
});

export const atencionEnfermeriaHistoryResponseSchema = z.object({
  adultoMayor: atencionEnfermeriaAdultoResumenSchema,
  atenciones: z.array(atencionEnfermeriaHistoryItemSchema),
});

export const createAtencionEnfermeriaResponseSchema = atencionEnfermeriaDetailSchema;
export const updateAtencionEnfermeriaResponseSchema = atencionEnfermeriaDetailSchema;

export type AtencionEnfermeriaCareType = z.infer<typeof atencionEnfermeriaCareTypeSchema>;
export type AtencionEnfermeriaGlucometriaContext = z.infer<
  typeof atencionEnfermeriaGlucometriaContextSchema
>;
export type AtencionEnfermeriaHistoryAccess = z.infer<typeof atencionEnfermeriaHistoryAccessSchema>;
export type AtencionEnfermeriaAdultoResumen = z.infer<typeof atencionEnfermeriaAdultoResumenSchema>;
export type AtencionEnfermeriaProfessional = z.infer<typeof atencionEnfermeriaProfessionalSchema>;
export type AtencionEnfermeriaVitalSigns = z.infer<typeof atencionEnfermeriaVitalSignsSchema>;
export type CreateAtencionEnfermeriaRequest = z.infer<typeof createAtencionEnfermeriaRequestSchema>;
export type UpdateAtencionEnfermeriaRequest = z.infer<typeof updateAtencionEnfermeriaRequestSchema>;
export type AtencionEnfermeriaListQuery = z.infer<typeof atencionEnfermeriaListQuerySchema>;
export type AtencionEnfermeriaLookupResponse = z.infer<
  typeof atencionEnfermeriaLookupResponseSchema
>;
export type AtencionEnfermeriaListItem = z.infer<typeof atencionEnfermeriaListItemSchema>;
export type AtencionEnfermeriaDetail = z.infer<typeof atencionEnfermeriaDetailSchema>;
export type AtencionEnfermeriaHistoryItem = z.infer<typeof atencionEnfermeriaHistoryItemSchema>;
export type AtencionEnfermeriaListResponse = z.infer<typeof atencionEnfermeriaListResponseSchema>;
export type AtencionEnfermeriaHistoryResponse = z.infer<
  typeof atencionEnfermeriaHistoryResponseSchema
>;
