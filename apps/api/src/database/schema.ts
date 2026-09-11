import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  primaryKey,
  pgEnum,
  pgTable,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRole = pgEnum("user_role", [
  "super_admin",
  "admin",
  "auditor",
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
export const adultoMayorStatus = pgEnum("adulto_mayor_status", ["alive", "deceased"]);
export const adultoMayorImportStatus = pgEnum("adulto_mayor_import_status", [
  "ready",
  "validated_with_errors",
  "committing",
  "completed",
  "failed",
  "expired",
]);
export const adultoMayorImportRowStatus = pgEnum("adulto_mayor_import_row_status", [
  "ready",
  "update_ready",
  "unchanged",
  "invalid",
  "existing",
]);
export const adultoMayorImportIssueSeverity = pgEnum("adulto_mayor_import_issue_severity", [
  "error",
  "warning",
]);
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
export const reportType = pgEnum("report_type", [
  "ACTAS_SESIONES_GRUPALES",
  "FORMATOS_ENTREGA_ALIMENTACION",
]);
export const reportStatus = pgEnum("report_status", [
  "pending",
  "processing",
  "ready",
  "empty",
  "failed",
  "cancelled",
  "expired",
]);
export const atencionEnfermeriaCareType = pgEnum("atencion_enfermeria_care_type", [
  "control_signos_vitales",
  "seguimiento",
  "procedimiento",
  "otro",
]);
export const atencionEnfermeriaGlucometriaContext = pgEnum(
  "atencion_enfermeria_glucometria_context",
  ["ayunas", "antes_de_comida", "despues_de_comida", "aleatoria"],
);

export const cie10Catalog = pgTable(
  "cie10_catalog",
  {
    code: varchar("code", { length: 10 }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    titleNormalized: varchar("title_normalized", { length: 255 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cie10_catalog_title_idx").on(table.title),
    index("cie10_catalog_title_normalized_idx").on(table.titleNormalized),
    index("cie10_catalog_is_active_idx").on(table.isActive),
  ],
);

export const referenceDataVersions = pgTable(
  "reference_data_versions",
  {
    dataset: varchar("dataset", { length: 100 }).primaryKey(),
    version: varchar("version", { length: 50 }).notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    rowCount: integer("row_count").notNull(),
    source: varchar("source", { length: 500 }).notNull(),
    appliedAt: timestamp("applied_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("reference_data_versions_row_count_positive", sql`${table.rowCount} > 0`)],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("departments_code_unique").on(table.code),
    uniqueIndex("departments_name_unique").on(table.name),
    index("departments_is_active_idx").on(table.isActive),
  ],
);

export const municipalities = pgTable(
  "municipalities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 10 }).notNull(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 120 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("municipalities_code_unique").on(table.code),
    uniqueIndex("municipalities_department_name_unique").on(table.departmentId, table.name),
    index("municipalities_department_id_idx").on(table.departmentId),
    index("municipalities_is_active_idx").on(table.isActive),
  ],
);

export const epsCatalog = pgTable(
  "eps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    nit: varchar("nit", { length: 20 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    nameNormalized: varchar("name_normalized", { length: 160 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("eps_code_unique").on(table.code),
    index("eps_nit_idx").on(table.nit),
    uniqueIndex("eps_name_normalized_unique").on(table.nameNormalized),
    index("eps_is_active_idx").on(table.isActive),
  ],
);

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
    departmentId: uuid("department_id").references(() => departments.id, {
      onDelete: "restrict",
    }),
    municipalityId: uuid("municipality_id").references(() => municipalities.id, {
      onDelete: "restrict",
    }),
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
    index("tenants_department_id_idx").on(table.departmentId),
    index("tenants_municipality_id_idx").on(table.municipalityId),
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

export const tenantLogoVersions = pgTable(
  "tenant_logo_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenant_logo_versions_tenant_created_at_idx").on(table.tenantId, table.createdAt),
    index("tenant_logo_versions_uploaded_by_user_idx").on(table.uploadedByUserId),
    check("tenant_logo_versions_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export const tenantBranding = pgTable(
  "tenant_branding",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    activeLogoVersionId: uuid("active_logo_version_id").references(() => tenantLogoVersions.id, {
      onDelete: "restrict",
    }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("tenant_branding_active_logo_version_idx").on(table.activeLogoVersionId)],
);

export const employeeSignatureVersions = pgTable(
  "employee_signature_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("employee_signature_versions_employee_idx").on(table.employeeId),
    index("employee_signature_versions_tenant_idx").on(table.tenantId),
    index("employee_signature_versions_uploaded_by_user_idx").on(table.uploadedByUserId),
    index("employee_signature_versions_created_at_idx").on(table.createdAt),
  ],
);

export const tenantDirectorSignatureAssignments = pgTable(
  "tenant_director_signature_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    signatureVersionId: uuid("signature_version_id")
      .notNull()
      .references(() => employeeSignatureVersions.id, { onDelete: "restrict" }),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tenant_director_signature_assignments_active_unique")
      .on(table.tenantId)
      .where(sql`${table.effectiveTo} is null`),
    index("tenant_director_signature_assignments_tenant_idx").on(table.tenantId),
    index("tenant_director_signature_assignments_employee_idx").on(table.employeeId),
    index("tenant_director_signature_assignments_signature_version_idx").on(
      table.signatureVersionId,
    ),
    index("tenant_director_signature_assignments_effective_from_idx").on(table.effectiveFrom),
    check(
      "tenant_director_signature_assignments_valid_range",
      sql`${table.effectiveTo} is null or ${table.effectiveTo} >= ${table.effectiveFrom}`,
    ),
  ],
);

export const tenantActiveSigners = pgTable(
  "tenant_active_signers",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    signatureVersionId: uuid("signature_version_id")
      .notNull()
      .references(() => employeeSignatureVersions.id, { onDelete: "restrict" }),
    activatedByUserId: uuid("activated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("tenant_active_signers_employee_idx").on(table.employeeId),
    index("tenant_active_signers_signature_version_idx").on(table.signatureVersionId),
    index("tenant_active_signers_activated_by_user_idx").on(table.activatedByUserId),
    index("tenant_active_signers_activated_at_idx").on(table.activatedAt),
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
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "restrict" }),
    municipalityId: uuid("municipality_id").references(() => municipalities.id, {
      onDelete: "restrict",
    }),
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
    healthRegime: varchar("health_regime", { length: 120 }),
    epsId: uuid("eps_id").references(() => epsCatalog.id, { onDelete: "restrict" }),
    eps: varchar("eps", { length: 160 }),
    livesWithSomeone: boolean("lives_with_someone").notNull().default(false),
    companion: varchar("companion", { length: 160 }),
    economicIncome: integer("economic_income"),
    socialProgramBeneficiary: boolean("social_program_beneficiary").notNull().default(false),
    birthDate: date("birth_date", { mode: "string" }).notNull(),
    sex: adultoMayorSex("sex").notNull(),
    status: adultoMayorStatus("status").notNull().default("alive"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("adultos_mayores_tenant_document_unique").on(
      table.tenantId,
      table.documentType,
      table.documentNumber,
    ),
    index("adultos_mayores_eps_id_idx").on(table.epsId),
    index("adultos_mayores_tenant_id_idx").on(table.tenantId),
    index("adultos_mayores_department_id_idx").on(table.departmentId),
    index("adultos_mayores_municipality_id_idx").on(table.municipalityId),
    index("adultos_mayores_names_idx").on(table.names),
    index("adultos_mayores_surnames_idx").on(table.surnames),
  ],
);

export const adultoMayorDocuments = pgTable(
  "adulto_mayor_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .unique()
      .references(() => adultosMayores.id, { onDelete: "cascade" }),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("adulto_mayor_documents_uploaded_by_user_idx").on(table.uploadedByUserId),
  ],
);

export const adultoMayorImportBatches = pgTable(
  "adulto_mayor_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    originalFilename: varchar("original_filename", { length: 260 }).notNull(),
    fileChecksumSha256: varchar("file_checksum_sha256", { length: 64 }).notNull(),
    templateVersion: integer("template_version").notNull(),
    status: adultoMayorImportStatus("status").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    readyRows: integer("ready_rows").notNull().default(0),
    updateRows: integer("update_rows").notNull().default(0),
    invalidRows: integer("invalid_rows").notNull().default(0),
    warningRows: integer("warning_rows").notNull().default(0),
    unchangedRows: integer("unchanged_rows").notNull().default(0),
    existingRows: integer("existing_rows").notNull().default(0),
    createdRows: integer("created_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    failureCode: varchar("failure_code", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("adulto_mayor_import_batches_tenant_created_at_idx").on(table.tenantId, table.createdAt),
    index("adulto_mayor_import_batches_requested_by_user_idx").on(
      table.requestedByUserId,
      table.createdAt,
    ),
    index("adulto_mayor_import_batches_status_expires_at_idx").on(table.status, table.expiresAt),
    index("adulto_mayor_import_batches_checksum_idx").on(table.fileChecksumSha256),
    check("adulto_mayor_import_batches_total_rows_non_negative", sql`${table.totalRows} >= 0`),
    check("adulto_mayor_import_batches_ready_rows_non_negative", sql`${table.readyRows} >= 0`),
    check("adulto_mayor_import_batches_update_rows_non_negative", sql`${table.updateRows} >= 0`),
    check("adulto_mayor_import_batches_invalid_rows_non_negative", sql`${table.invalidRows} >= 0`),
    check("adulto_mayor_import_batches_warning_rows_non_negative", sql`${table.warningRows} >= 0`),
    check(
      "adulto_mayor_import_batches_unchanged_rows_non_negative",
      sql`${table.unchangedRows} >= 0`,
    ),
    check(
      "adulto_mayor_import_batches_existing_rows_non_negative",
      sql`${table.existingRows} >= 0`,
    ),
    check("adulto_mayor_import_batches_created_rows_non_negative", sql`${table.createdRows} >= 0`),
    check("adulto_mayor_import_batches_updated_rows_non_negative", sql`${table.updatedRows} >= 0`),
    check(
      "adulto_mayor_import_batches_template_version_positive",
      sql`${table.templateVersion} > 0`,
    ),
  ],
);

export const adultoMayorImportRows = pgTable(
  "adulto_mayor_import_rows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    importBatchId: uuid("import_batch_id")
      .notNull()
      .references(() => adultoMayorImportBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    status: adultoMayorImportRowStatus("status").notNull(),
    normalizedPayload: jsonb("normalized_payload").$type<Record<string, unknown>>(),
    issues: jsonb("issues")
      .$type<
        Array<{
          rowNumber: number;
          column: string;
          code: string;
          severity: "error" | "warning";
          message: string;
          receivedValue: string | null;
        }>
      >()
      .notNull()
      .default(sql`'[]'::jsonb`),
    existingAdultoId: uuid("existing_adulto_id").references(() => adultosMayores.id, {
      onDelete: "restrict",
    }),
    existingAdultoUpdatedAt: timestamp("existing_adulto_updated_at", { withTimezone: true }),
    createdAdultoId: uuid("created_adulto_id").references(() => adultosMayores.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("adulto_mayor_import_rows_batch_row_unique").on(
      table.importBatchId,
      table.rowNumber,
    ),
    index("adulto_mayor_import_rows_batch_status_idx").on(table.importBatchId, table.status),
    index("adulto_mayor_import_rows_existing_adulto_idx").on(table.existingAdultoId),
    index("adulto_mayor_import_rows_created_adulto_idx").on(table.createdAdultoId),
    check("adulto_mayor_import_rows_row_number_positive", sql`${table.rowNumber} > 0`),
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
    actaNumber: varchar("acta_number", { length: 40 }).notNull(),
    activityName: varchar("activity_name", { length: 160 }).notNull(),
    activityType: actividadGrupalType("activity_type").notNull(),
    activityDate: date("activity_date", { mode: "string" }).notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    organizer: actividadGrupalOrganizer("organizer").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("actividades_grupales_tenant_acta_unique").on(table.tenantId, table.actaNumber),
    index("actividades_grupales_tenant_date_idx").on(table.tenantId, table.activityDate),
    index("actividades_grupales_tenant_deleted_at_idx").on(table.tenantId, table.deletedAt),
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

export const alimentacionFormatoEmissions = pgTable(
  "alimentacion_formato_emissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
    deliveryMonth: varchar("delivery_month", { length: 7 }).notNull(),
    version: integer("version").notNull(),
    signerEmployeeIdSnapshot: uuid("signer_employee_id_snapshot")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    signerNameSnapshot: varchar("signer_name_snapshot", { length: 180 }).notNull(),
    signerRoleSnapshot: varchar("signer_role_snapshot", { length: 80 }).notNull(),
    signatureVersionIdSnapshot: uuid("signature_version_id_snapshot")
      .notNull()
      .references(() => employeeSignatureVersions.id, { onDelete: "restrict" }),
    tenantLogoVersionIdSnapshot: uuid("tenant_logo_version_id_snapshot").references(
      () => tenantLogoVersions.id,
      { onDelete: "restrict" },
    ),
    filename: varchar("filename", { length: 260 }).notNull(),
    pdfRelativePath: varchar("pdf_relative_path", { length: 500 }).notNull(),
    sourceRecordCount: integer("source_record_count").notNull(),
    sourceDateFrom: date("source_date_from", { mode: "string" }),
    sourceDateTo: date("source_date_to", { mode: "string" }),
    issuedByUserId: uuid("issued_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("alimentacion_formato_emissions_unique_version").on(
      table.adultoMayorId,
      table.deliveryMonth,
      table.version,
    ),
    index("alimentacion_formato_emissions_tenant_month_idx").on(
      table.tenantId,
      table.deliveryMonth,
    ),
    index("alimentacion_formato_emissions_adulto_mayor_idx").on(table.adultoMayorId),
    index("alimentacion_formato_emissions_signer_employee_idx").on(table.signerEmployeeIdSnapshot),
    index("alimentacion_formato_emissions_issued_at_idx").on(table.issuedAt),
  ],
);

export const alimentacionFormatoImportedVersions = pgTable(
  "alimentacion_formato_imported_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
    deliveryMonth: varchar("delivery_month", { length: 7 }).notNull(),
    version: integer("version").notNull(),
    source: varchar("source", { length: 20 }).notNull().default("importado"),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    storedName: varchar("stored_name", { length: 260 }).notNull(),
    pdfRelativePath: varchar("pdf_relative_path", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    importedByUserId: uuid("imported_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("alimentacion_formato_imported_versions_unique_version").on(
      table.adultoMayorId,
      table.deliveryMonth,
      table.version,
    ),
    index("alimentacion_formato_imported_versions_tenant_month_idx").on(
      table.tenantId,
      table.deliveryMonth,
    ),
    index("alimentacion_formato_imported_versions_adulto_mayor_idx").on(table.adultoMayorId),
    index("alimentacion_formato_imported_versions_imported_by_user_idx").on(table.importedByUserId),
    check("alimentacion_formato_imported_versions_size_positive", sql`${table.sizeBytes} > 0`),
  ],
);

export const atencionIndividualCounters = pgTable(
  "atencion_individual_counters",
  {
    tenantId: uuid("tenant_id")
      .primaryKey()
      .references(() => tenants.id, { onDelete: "cascade" }),
    lastValue: integer("last_value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("atencion_individual_counters_updated_at_idx").on(table.updatedAt)],
);

export const atencionesIndividuales = pgTable(
  "atenciones_individuales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
    attentionDate: date("attention_date", { mode: "string" }).notNull(),
    modalidad: varchar("modalidad", { length: 40 }).notNull(),
    tipoConsulta: varchar("tipo_consulta", { length: 40 }).notNull(),
    nombreConsulta: varchar("nombre_consulta", { length: 160 }).notNull(),
    consecutive: integer("consecutive").notNull(),
    finalidad: varchar("finalidad", { length: 60 }).notNull(),
    causaExterna: varchar("causa_externa", { length: 60 }).notNull(),
    motivoConsulta: text("motivo_consulta").notNull(),
    enfermedadActual: text("enfermedad_actual").notNull(),
    antecedentesPersonales: text("antecedentes_personales"),
    antecedentesFamiliares: text("antecedentes_familiares"),
    tensionSistolica: integer("tension_sistolica"),
    tensionDiastolica: integer("tension_diastolica"),
    frecuenciaCardiaca: integer("frecuencia_cardiaca"),
    frecuenciaRespiratoria: integer("frecuencia_respiratoria"),
    temperatura: doublePrecision("temperatura"),
    saturacionOxigeno: integer("saturacion_oxigeno"),
    pesoKg: doublePrecision("peso_kg"),
    tallaCm: doublePrecision("talla_cm"),
    imc: doublePrecision("imc"),
    perimetroAbdominalCm: doublePrecision("perimetro_abdominal_cm"),
    examenFisico: text("examen_fisico"),
    resultadosLaboratorios: text("resultados_laboratorios"),
    resultadosProcedimientos: text("resultados_procedimientos"),
    ordenesMedicas: jsonb("ordenes_medicas")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    diagnosticos: jsonb("diagnosticos")
      .$type<Array<Record<string, unknown>>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
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
    uniqueIndex("atenciones_individuales_tenant_consecutive_unique").on(
      table.tenantId,
      table.consecutive,
    ),
    index("atenciones_individuales_tenant_date_idx").on(table.tenantId, table.attentionDate),
    index("atenciones_individuales_adulto_mayor_idx").on(table.adultoMayorId),
    index("atenciones_individuales_created_by_user_idx").on(table.createdByUserId),
    index("atenciones_individuales_updated_by_user_idx").on(table.updatedByUserId),
  ],
);

export const atencionesEnfermeria = pgTable(
  "atenciones_enfermeria",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    adultoMayorId: uuid("adulto_mayor_id")
      .notNull()
      .references(() => adultosMayores.id, { onDelete: "restrict" }),
    attentionDate: date("attention_date", { mode: "string" }).notNull(),
    attentionTime: time("attention_time", { precision: 0 }).notNull(),
    careType: atencionEnfermeriaCareType("care_type").notNull(),
    reason: text("reason"),
    tensionSistolica: integer("tension_sistolica"),
    tensionDiastolica: integer("tension_diastolica"),
    frecuenciaCardiaca: integer("frecuencia_cardiaca"),
    frecuenciaRespiratoria: integer("frecuencia_respiratoria"),
    temperatura: doublePrecision("temperatura"),
    saturacionOxigeno: integer("saturacion_oxigeno"),
    pesoKg: doublePrecision("peso_kg"),
    tallaCm: doublePrecision("talla_cm"),
    imc: doublePrecision("imc"),
    perimetroAbdominalCm: doublePrecision("perimetro_abdominal_cm"),
    glucometriaMgDl: integer("glucometria_mg_dl"),
    glucometriaContext: atencionEnfermeriaGlucometriaContext("glucometria_context"),
    nursingNote: text("nursing_note").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedByUserId: uuid("updated_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("atenciones_enfermeria_tenant_date_idx").on(table.tenantId, table.attentionDate),
    index("atenciones_enfermeria_adulto_date_idx").on(table.adultoMayorId, table.attentionDate),
    index("atenciones_enfermeria_created_by_date_idx").on(
      table.createdByUserId,
      table.attentionDate,
    ),
    index("atenciones_enfermeria_tenant_updated_at_idx").on(table.tenantId, table.updatedAt),
    check(
      "atenciones_enfermeria_has_measurement",
      sql`${table.tensionSistolica} is not null
        or ${table.tensionDiastolica} is not null
        or ${table.frecuenciaCardiaca} is not null
        or ${table.frecuenciaRespiratoria} is not null
        or ${table.temperatura} is not null
        or ${table.saturacionOxigeno} is not null
        or ${table.pesoKg} is not null
        or ${table.tallaCm} is not null
        or ${table.perimetroAbdominalCm} is not null
        or ${table.glucometriaMgDl} is not null`,
    ),
    check(
      "atenciones_enfermeria_glucometria_pair",
      sql`(${table.glucometriaMgDl} is null and ${table.glucometriaContext} is null)
        or (${table.glucometriaMgDl} is not null and ${table.glucometriaContext} is not null)`,
    ),
    check(
      "atenciones_enfermeria_measurements_range",
      sql`(${table.tensionSistolica} is null or ${table.tensionSistolica} between 0 and 999999)
        and (${table.tensionDiastolica} is null or ${table.tensionDiastolica} between 0 and 999999)
        and (${table.frecuenciaCardiaca} is null or ${table.frecuenciaCardiaca} between 0 and 999999)
        and (${table.frecuenciaRespiratoria} is null or ${table.frecuenciaRespiratoria} between 0 and 999999)
        and (${table.temperatura} is null or ${table.temperatura} between 0 and 999999)
        and (${table.saturacionOxigeno} is null or ${table.saturacionOxigeno} between 0 and 999999)
        and (${table.pesoKg} is null or ${table.pesoKg} between 0 and 999999)
        and (${table.tallaCm} is null or ${table.tallaCm} between 0 and 999999)
        and (${table.imc} is null or ${table.imc} between 0 and 999999)
        and (${table.perimetroAbdominalCm} is null or ${table.perimetroAbdominalCm} between 0 and 999999)`,
    ),
    check(
      "atenciones_enfermeria_glucometria_range",
      sql`${table.glucometriaMgDl} is null or ${table.glucometriaMgDl} between 20 and 600`,
    ),
    check(
      "atenciones_enfermeria_reason_length",
      sql`${table.reason} is null or char_length(${table.reason}) <= 1000`,
    ),
    check(
      "atenciones_enfermeria_nursing_note_length",
      sql`char_length(btrim(${table.nursingNote})) between 1 and 4000`,
    ),
    check("atenciones_enfermeria_version_positive", sql`${table.version} > 0`),
  ],
);

export const atencionIndividualSupportFiles = pgTable(
  "atencion_individual_support_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    atencionId: uuid("atencion_id")
      .notNull()
      .references(() => atencionesIndividuales.id, { onDelete: "cascade" }),
    originalName: varchar("original_name", { length: 260 }).notNull(),
    storedName: varchar("stored_name", { length: 260 }).notNull(),
    mimeType: varchar("mime_type", { length: 160 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksum: varchar("checksum", { length: 64 }),
    relativePath: varchar("relative_path", { length: 500 }).notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("atencion_individual_support_files_atencion_idx").on(table.atencionId),
    index("atencion_individual_support_files_created_by_user_idx").on(table.createdByUserId),
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

export const reportJobs = pgTable(
  "report_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "restrict" }),
    tenantName: varchar("tenant_name", { length: 160 }).notNull(),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    requestedByRole: userRole("requested_by_role").notNull(),
    type: reportType("type").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    status: reportStatus("status").notNull().default("pending"),
    totalDocuments: integer("total_documents"),
    processedDocuments: integer("processed_documents").notNull().default(0),
    failedDocuments: integer("failed_documents").notNull().default(0),
    storageKey: varchar("storage_key", { length: 500 }),
    downloadFilename: varchar("download_filename", { length: 260 }),
    errorCode: varchar("error_code", { length: 80 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("report_jobs_tenant_created_at_idx").on(table.tenantId, table.createdAt),
    index("report_jobs_status_expires_at_idx").on(table.status, table.expiresAt),
    index("report_jobs_requested_by_user_idx").on(table.requestedByUserId, table.createdAt),
    uniqueIndex("report_jobs_active_unique")
      .on(table.tenantId, table.type, table.period)
      .where(sql`${table.status} in ('pending', 'processing')`),
    check("report_jobs_period_format", sql`${table.period} ~ '^\\d{4}-(0[1-9]|1[0-2])$'`),
    check(
      "report_jobs_total_documents_non_negative",
      sql`${table.totalDocuments} is null or ${table.totalDocuments} >= 0`,
    ),
    check("report_jobs_processed_documents_non_negative", sql`${table.processedDocuments} >= 0`),
    check("report_jobs_failed_documents_non_negative", sql`${table.failedDocuments} >= 0`),
    check(
      "report_jobs_processed_not_greater_than_total",
      sql`${table.totalDocuments} is null or ${table.processedDocuments} <= ${table.totalDocuments}`,
    ),
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
