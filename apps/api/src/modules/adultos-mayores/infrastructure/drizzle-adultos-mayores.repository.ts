import { Injectable } from "@nestjs/common";
import {
  adultoMayorBloodTypeSchema,
  adultoMayorHealthRegimeSchema,
  adultoMayorZoneSchema,
} from "@cuidarte/contracts";
import { and, asc, eq, ilike, ne, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { adultoMayorDocuments, adultosMayores, auditLogs, epsCatalog, tenants } from "../../../database/schema";
import {
  type AdultoMayorAuditCommand,
  type AdultoMayorCommandRecord,
  type AdultoMayorRecord,
  type AdultoMayorTenantOptionRecord,
  type CreateAdultoMayorRecordCommand,
  type FindAdultoMayorByDocumentQuery,
  type FindAdultoMayorByIdQuery,
  type FindAdultosMayoresQuery,
  type UpdateAdultoMayorRecordCommand,
  type AdultoMayorDocumentRecord,
} from "../domain/adulto-mayor.types";
import { type AdultosMayoresRepository } from "../domain/adultos-mayores.repository";

type AdultoMayorSelectionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: AdultoMayorRecord["documentType"];
  documentNumber: string;
  names: string;
  surnames: string;
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  birthDate: string;
  sex: AdultoMayorRecord["sex"];
  status: AdultoMayorRecord["status"];
  educationLevel: string | null;
  disability: string | null;
  populationGroup: string | null;
  address: string;
  departmentId: string | null;
  municipalityId: string | null;
  department: string;
  municipality: string;
  zone: string;
  country: string;
  emergencyContactFullName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  bloodType: string | null;
  sisben: string | null;
  healthRegime: string | null;
  epsId: string | null;
  epsName: string | null;
  legacyEps: string | null;
  livesWithSomeone: boolean;
  companion: string | null;
  economicIncome: number | null;
  socialProgramBeneficiary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DrizzleAdultosMayoresRepository implements AdultosMayoresRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(query: FindAdultosMayoresQuery): Promise<AdultoMayorRecord[]> {
    const rows = await this.database.db
      .select(this.getAdultoMayorSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(this.buildWhere(query))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names));

    return rows.map((row) => this.toRecord(row));
  }

  async findById(query: FindAdultoMayorByIdQuery): Promise<AdultoMayorRecord | null> {
    const [row] = await this.database.db
      .select(this.getAdultoMayorSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(this.buildScopedWhere(query.scope, [eq(adultosMayores.id, query.id)]))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findByDocument(query: FindAdultoMayorByDocumentQuery): Promise<AdultoMayorRecord | null> {
    const conditions = [
      eq(adultosMayores.tenantId, query.tenantId),
      eq(adultosMayores.documentType, query.documentType),
      eq(adultosMayores.documentNumber, query.documentNumber),
    ];

    if (query.excludeId !== undefined) {
      conditions.push(ne(adultosMayores.id, query.excludeId));
    }

    const [row] = await this.database.db
      .select(this.getAdultoMayorSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findTenantOptions(): Promise<AdultoMayorTenantOptionRecord[]> {
    return await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .orderBy(asc(tenants.name));
  }

  async findDocumentByAdultoId(adultoMayorId: string): Promise<AdultoMayorDocumentRecord | null> {
    const [row] = await this.database.db
      .select()
      .from(adultoMayorDocuments)
      .where(eq(adultoMayorDocuments.adultoMayorId, adultoMayorId))
      .limit(1);

    return row === undefined ? null : this.toDocumentRecord(row);
  }

  async saveDocument(document: AdultoMayorDocumentRecord): Promise<AdultoMayorDocumentRecord> {
    const [row] = await this.database.db
      .insert(adultoMayorDocuments)
      .values({
        id: document.id,
        adultoMayorId: document.adultoMayorId,
        originalName: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        relativePath: document.relativePath,
        uploadedByUserId: document.uploadedByUserId,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      })
      .onConflictDoUpdate({
        target: adultoMayorDocuments.adultoMayorId,
        set: {
          id: document.id,
          originalName: document.originalName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          relativePath: document.relativePath,
          uploadedByUserId: document.uploadedByUserId,
          updatedAt: document.updatedAt,
        },
      })
      .returning();

    if (row === undefined) throw new Error("No fue posible guardar el documento del adulto mayor.");
    return this.toDocumentRecord(row);
  }

  async deleteDocument(adultoMayorId: string): Promise<AdultoMayorDocumentRecord | null> {
    const [row] = await this.database.db
      .delete(adultoMayorDocuments)
      .where(eq(adultoMayorDocuments.adultoMayorId, adultoMayorId))
      .returning();

    return row === undefined ? null : this.toDocumentRecord(row);
  }

  async create(
    command: CreateAdultoMayorRecordCommand,
    audit: AdultoMayorAuditCommand,
  ): Promise<AdultoMayorRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [created] = await tx
        .insert(adultosMayores)
        .values({
          tenantId: command.tenantId,
          ...this.buildMutableValues(command),
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: adultosMayores.id });

      if (created === undefined) {
        throw new Error("No fue posible crear el adulto mayor.");
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit));

      const [row] = await tx
        .select(this.getAdultoMayorSelection())
        .from(adultosMayores)
        .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
        .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
        .where(eq(adultosMayores.id, created.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar el adulto mayor creado.");
      }

      return this.toRecord(row);
    });
  }

  async update(
    command: UpdateAdultoMayorRecordCommand,
    audit: AdultoMayorAuditCommand,
  ): Promise<AdultoMayorRecord> {
    return await this.database.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(adultosMayores)
        .set({
          ...this.buildMutableValues(command),
          updatedAt: new Date(),
        })
        .where(eq(adultosMayores.id, command.id))
        .returning({ id: adultosMayores.id });

      if (updated === undefined) {
        throw new Error("No fue posible actualizar el adulto mayor.");
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit));

      const [row] = await tx
        .select(this.getAdultoMayorSelection())
        .from(adultosMayores)
        .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
        .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
        .where(eq(adultosMayores.id, updated.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar el adulto mayor actualizado.");
      }

      return this.toRecord(row);
    });
  }

  private buildWhere(query: FindAdultosMayoresQuery): SQL | undefined {
    const conditions = this.buildScopeConditions(query.scope);

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;
      const searchCondition = or(
        ilike(adultosMayores.documentNumber, searchPattern),
        ilike(adultosMayores.names, searchPattern),
        ilike(adultosMayores.surnames, searchPattern),
        ilike(adultosMayores.phone, searchPattern),
        ilike(adultosMayores.phoneSecondary, searchPattern),
        ilike(adultosMayores.email, searchPattern),
        ilike(tenants.name, searchPattern),
      );

      if (searchCondition !== undefined) {
        conditions.push(searchCondition);
      }
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildScopedWhere(
    scope: FindAdultosMayoresQuery["scope"],
    extraConditions: SQL[],
  ): SQL | undefined {
    const conditions = [...this.buildScopeConditions(scope), ...extraConditions];

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildScopeConditions(scope: FindAdultosMayoresQuery["scope"]): SQL[] {
    if (scope.type === "tenant") {
      return [eq(adultosMayores.tenantId, scope.tenantId)];
    }

    return [];
  }

  private getAdultoMayorSelection() {
    return {
      id: adultosMayores.id,
      tenantId: adultosMayores.tenantId,
      tenantName: tenants.name,
      documentType: adultosMayores.documentType,
      documentNumber: adultosMayores.documentNumber,
      names: adultosMayores.names,
      surnames: adultosMayores.surnames,
      firstName: adultosMayores.firstName,
      middleName: adultosMayores.middleName,
      firstSurname: adultosMayores.firstSurname,
      secondSurname: adultosMayores.secondSurname,
      phone: adultosMayores.phone,
      phoneSecondary: adultosMayores.phoneSecondary,
      email: adultosMayores.email,
      birthDate: adultosMayores.birthDate,
      sex: adultosMayores.sex,
      status: adultosMayores.status,
      educationLevel: adultosMayores.educationLevel,
      disability: adultosMayores.disability,
      populationGroup: adultosMayores.populationGroup,
      address: adultosMayores.address,
      departmentId: adultosMayores.departmentId,
      municipalityId: adultosMayores.municipalityId,
      department: adultosMayores.department,
      municipality: adultosMayores.municipality,
      zone: adultosMayores.zone,
      country: adultosMayores.country,
      emergencyContactFullName: adultosMayores.emergencyContactFullName,
      emergencyContactRelationship: adultosMayores.emergencyContactRelationship,
      emergencyContactPhone: adultosMayores.emergencyContactPhone,
      emergencyContactAddress: adultosMayores.emergencyContactAddress,
      bloodType: adultosMayores.bloodType,
      sisben: adultosMayores.sisben,
      healthRegime: adultosMayores.healthRegime,
      epsId: adultosMayores.epsId,
      epsName: epsCatalog.name,
      legacyEps: adultosMayores.eps,
      livesWithSomeone: adultosMayores.livesWithSomeone,
      companion: adultosMayores.companion,
      economicIncome: adultosMayores.economicIncome,
      socialProgramBeneficiary: adultosMayores.socialProgramBeneficiary,
      createdAt: adultosMayores.createdAt,
      updatedAt: adultosMayores.updatedAt,
    };
  }

  private buildMutableValues(command: Omit<AdultoMayorCommandRecord, "tenantId">) {
    return {
      documentType: command.documentType,
      documentNumber: command.documentNumber,
      names: joinNameParts(command.firstName, command.middleName),
      surnames: joinNameParts(command.firstSurname, command.secondSurname),
      firstName: command.firstName,
      middleName: command.middleName,
      firstSurname: command.firstSurname,
      secondSurname: command.secondSurname,
      phone: command.phone,
      phoneSecondary: command.phoneSecondary,
      email: command.email,
      birthDate: command.birthDate,
      sex: command.sex,
      status: command.status,
      educationLevel: command.educationLevel,
      disability: command.disability,
      populationGroup: command.populationGroup,
      address: command.address,
      departmentId: command.departmentId,
      municipalityId: command.municipalityId,
      department: command.department,
      municipality: command.municipality,
      zone: command.zone,
      country: command.country,
      emergencyContactFullName: command.emergencyContactFullName,
      emergencyContactRelationship: command.emergencyContactRelationship,
      emergencyContactPhone: command.emergencyContactPhone,
      emergencyContactAddress: command.emergencyContactAddress,
      bloodType: command.bloodType,
      sisben: command.sisben,
      healthRegime: command.healthRegime,
      epsId: command.epsId,
      livesWithSomeone: command.livesWithSomeone,
      companion: command.companion,
      economicIncome: command.economicIncome,
      socialProgramBeneficiary: command.socialProgramBeneficiary,
    } satisfies Partial<typeof adultosMayores.$inferInsert>;
  }

  private toAuditInsert(audit: AdultoMayorAuditCommand): typeof auditLogs.$inferInsert {
    return {
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetTenantId: audit.targetTenantId,
      summary: audit.summary,
      metadata: audit.metadata,
    };
  }

  private toRecord(row: AdultoMayorSelectionRow): AdultoMayorRecord {
    const { legacyEps, ...record } = row;

    return {
      ...record,
      eps: row.epsName ?? legacyEps,
      zone: adultoMayorZoneSchema.parse(row.zone),
      bloodType: row.bloodType === null ? null : adultoMayorBloodTypeSchema.parse(row.bloodType),
      healthRegime:
        row.healthRegime === null ? null : adultoMayorHealthRegimeSchema.parse(row.healthRegime),
      documentFile: null,
    };
  }

  private toDocumentRecord(row: typeof adultoMayorDocuments.$inferSelect): AdultoMayorDocumentRecord {
    return { ...row, mimeType: "application/pdf" };
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function joinNameParts(requiredName: string, optionalName: string | null): string {
  return optionalName === null ? requiredName : `${requiredName} ${optionalName}`;
}
