import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  primaryKey,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", [
  "super_admin",
  "admin",
  "director",
  "enfermeria",
  "fisioterapeuta",
  "medico",
  "nutricionista",
  "psicologo",
  "recreacionista",
  "trabajadora_social",
]);
export const tenantDocumentType = pgEnum("tenant_document_type", ["nit", "cc", "ce"]);
export const adultoMayorDocumentType = pgEnum("adulto_mayor_document_type", [
  "cc",
  "ce",
  "passport",
  "other",
]);
export const adultoMayorSex = pgEnum("adulto_mayor_sex", ["female", "male", "other"]);
export const actividadGrupalType = pgEnum("actividad_grupal_type", [
  "centro_vida",
  "actividad_campo",
  "sesiones_psicosocial",
  "salud_preventiva",
  "nutricion",
  "fisioterapia",
  "encuentro_intergeneracional",
  "actividades_manualidad",
  "actividades_recreacion",
]);
export const actividadGrupalOrganizer = pgEnum("actividad_grupal_organizer", [
  "director",
  "medico",
  "enfermeria",
  "psicologa",
  "trabajadora_social",
  "nutricionista",
  "fisioterapeuta",
  "recreacionista",
]);
export const actividadGrupalResponsibleDepartment = pgEnum(
  "actividad_grupal_responsible_department",
  [
    "direccion",
    "medicina",
    "enfermeria",
    "psicologia",
    "trabajo_social",
    "nutricion",
    "fisioterapia",
    "recreacion",
  ],
);
export const actividadGrupalSupportFileKind = pgEnum("actividad_grupal_support_file_kind", [
  "support_photo",
  "support_pdf",
]);
export const alimentacionStatus = pgEnum("alimentacion_status", [
  "entregado",
  "no_entregado",
  "no_aplica",
]);
export const alimentacionOrganizer = pgEnum("alimentacion_organizer", [
  "director",
  "medico",
  "enfermeria",
  "psicologa",
  "trabajadora_social",
  "nutricionista",
  "fisioterapeuta",
  "recreacionista",
]);

export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentType: tenantDocumentType("document_type").notNull(),
    documentNumber: varchar("document_number", { length: 80 }),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    address: varchar("address", { length: 220 }),
    city: varchar("city", { length: 100 }),
    department: varchar("department", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenants_document_unique")
      .on(table.documentType, table.documentNumber)
      .where(sql`${table.documentNumber} is not null`),
    uniqueIndex("tenants_email_unique")
      .on(table.email)
      .where(sql`${table.email} is not null`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "restrict" }),
    email: varchar("email", { length: 320 }).notNull(),
    fullName: varchar("full_name", { length: 180 }).notNull(),
    firstName: varchar("first_name", { length: 80 }),
    middleName: varchar("middle_name", { length: 80 }),
    firstSurname: varchar("first_surname", { length: 80 }),
    secondSurname: varchar("second_surname", { length: 80 }),
    documentNumber: varchar("document_number", { length: 80 }),
    phone: varchar("phone", { length: 40 }),
    role: userRole("role").notNull(),
    isTenantOwner: boolean("is_tenant_owner").notNull().default(false),
    passwordHash: text("password_hash").notNull(),
    passwordSetByAdmin: boolean("password_set_by_admin").notNull().default(true),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_tenant_owner_unique")
      .on(table.tenantId)
      .where(sql`${table.isTenantOwner} = true and ${table.tenantId} is not null`),
    uniqueIndex("users_tenant_document_unique")
      .on(table.tenantId, table.documentNumber)
      .where(sql`${table.tenantId} is not null and ${table.documentNumber} is not null`),
    uniqueIndex("users_global_document_unique")
      .on(table.documentNumber)
      .where(sql`${table.tenantId} is null and ${table.documentNumber} is not null`),
    index("users_tenant_id_idx").on(table.tenantId),
  ],
);

export const adultosMayores = pgTable(
  "adultos_mayores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    documentType: adultoMayorDocumentType("document_type").notNull(),
    documentNumber: varchar("document_number", { length: 80 }).notNull(),
    names: varchar("names", { length: 180 }).notNull(),
    surnames: varchar("surnames", { length: 180 }).notNull(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    middleName: varchar("middle_name", { length: 80 }),
    firstSurname: varchar("first_surname", { length: 80 }).notNull(),
    secondSurname: varchar("second_surname", { length: 80 }),
    educationLevel: varchar("education_level", { length: 80 }),
    disability: varchar("disability", { length: 120 }),
    populationGroup: varchar("population_group", { length: 120 }),
    address: varchar("address", { length: 220 }).notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    municipality: varchar("municipality", { length: 100 }).notNull(),
    zone: varchar("zone", { length: 20 }).notNull(),
    country: varchar("country", { length: 80 }).notNull().default("Colombia"),
    phone: varchar("phone", { length: 40 }),
    phoneSecondary: varchar("phone_secondary", { length: 40 }),
    email: varchar("email", { length: 320 }),
    emergencyContactFullName: varchar("emergency_contact_full_name", { length: 180 }),
    emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 80 }),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 40 }),
    emergencyContactAddress: varchar("emergency_contact_address", { length: 220 }),
    bloodType: varchar("blood_type", { length: 20 }),
    sisben: varchar("sisben", { length: 40 }),
    healthRegime: varchar("health_regime", { length: 40 }),
    eps: varchar("eps", { length: 160 }),
    livesWithSomeone: boolean("lives_with_someone").notNull().default(false),
    companion: varchar("companion", { length: 160 }),
    economicIncome: integer("economic_income"),
    socialProgramBeneficiary: boolean("social_program_beneficiary").notNull().default(false),
    birthDate: date("birth_date", { mode: "string" }).notNull(),
    sex: adultoMayorSex("sex").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("adultos_mayores_tenant_document_unique").on(
      table.tenantId,
      table.documentType,
      table.documentNumber,
    ),
    index("adultos_mayores_tenant_id_idx").on(table.tenantId),
    index("adultos_mayores_names_idx").on(table.names),
    index("adultos_mayores_surnames_idx").on(table.surnames),
  ],
);

export const actividadGrupalActaCounters = pgTable(
  "actividad_grupal_acta_counters",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    lastValue: integer("last_value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("actividad_grupal_acta_counters_updated_at_idx").on(table.updatedAt)],
);

export const actividadesGrupales = pgTable(
  "actividades_grupales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    actaNumber: integer("acta_number").notNull(),
    activityName: varchar("activity_name", { length: 160 }).notNull(),
    activityType: actividadGrupalType("activity_type").notNull(),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    organizer: actividadGrupalOrganizer("organizer").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("actividades_grupales_tenant_acta_unique").on(table.tenantId, table.actaNumber),
    index("actividades_grupales_tenant_date_idx").on(table.tenantId, table.activityDate),
    index("actividades_grupales_created_by_user_idx").on(table.createdByUserId),
  ],
);

export const actividadGrupalEmpleados = pgTable(
  "actividad_grupal_empleados",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => actividadesGrupales.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "actividad_grupal_empleados_pk",
      columns: [table.activityId, table.employeeId],
    }),
    index("actividad_grupal_empleados_employee_idx").on(table.employeeId),
  ],
);

export const actividadGrupalDiligenciamientos = pgTable(
  "actividad_grupal_diligenciamientos",
  {
    activityId: uuid("activity_id")
      .primaryKey()
      .references(() => actividadesGrupales.id, { onDelete: "cascade" }),
    objectives: text("objectives").notNull(),
    development: text("development").notNull(),
    conclusion: text("conclusion").notNull(),
    responsibleDepartment: actividadGrupalResponsibleDepartment("responsible_department").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("actividad_grupal_diligenciamientos_created_by_user_idx").on(table.createdByUserId),
    index("actividad_grupal_diligenciamientos_updated_by_user_idx").on(table.updatedByUserId),
  ],
);

export const actividadGrupalDiligenciamientoIntegrantes = pgTable(
  "actividad_grupal_diligenciamiento_integrantes",
  {
    activityId: uuid("activity_id")
      .notNull()
      .references(() => actividadesGrupales.id, { onDelete: "cascade" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      name: "actividad_grupal_diligenciamiento_integrantes_pk",
      columns: [table.activityId, table.adultoMayorId],
    }),
    index("actividad_grupal_dilig_integrantes_adulto_mayor_idx").on(table.adultoMayorId),
  ],
);

export const actividadGrupalDiligenciamientoFiles = pgTable(
  "actividad_grupal_diligenciamiento_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityId: uuid("activity_id")
      .notNull()
      .references(() => actividadesGrupales.id, { onDelete: "cascade" }),
    kind: actividadGrupalSupportFileKind("kind").notNull(),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("actividad_grupal_dilig_files_activity_idx").on(table.activityId),
    index("actividad_grupal_dilig_files_kind_idx").on(table.kind),
    index("actividad_grupal_dilig_files_created_by_user_idx").on(table.createdByUserId),
  ],
);

export const alimentacionRegistros = pgTable(
  "alimentacion_registros",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    organizer: alimentacionOrganizer("organizer").notNull(),
    refrigerio1: alimentacionStatus("refrigerio_1").notNull(),
    almuerzo: alimentacionStatus("almuerzo").notNull(),
    refrigerio2: alimentacionStatus("refrigerio_2").notNull(),
    auxilioTransporte: alimentacionStatus("auxilio_transporte").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("alimentacion_registros_tenant_adulto_fecha_unique").on(
      table.tenantId,
      table.adultoMayorId,
      table.deliveryDate,
    ),
    index("alimentacion_registros_tenant_date_idx").on(table.tenantId, table.deliveryDate),
    index("alimentacion_registros_adulto_mayor_idx").on(table.adultoMayorId),
    index("alimentacion_registros_created_by_user_idx").on(table.createdByUserId),
    index("alimentacion_registros_updated_by_user_idx").on(table.updatedByUserId),
  ],
);

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdIp: varchar("created_ip", { length: 64 }),
    createdUserAgent: text("created_user_agent"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("user_sessions_token_hash_unique").on(table.tokenHash),
    index("user_sessions_user_id_idx").on(table.userId),
    index("user_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: varchar("action", { length: 80 }).notNull(),
    targetTenantId: uuid("target_tenant_id").references(() => tenants.id, { onDelete: "restrict" }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "restrict" }),
    summary: text("summary").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    index("audit_logs_target_tenant_id_idx").on(table.targetTenantId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);
