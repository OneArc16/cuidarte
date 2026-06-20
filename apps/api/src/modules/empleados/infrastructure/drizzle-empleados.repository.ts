import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, ilike, isNull, lte, ne, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  auditLogs,
  employeeSignatureVersions,
  tenantDirectorSignatureAssignments,
  tenants,
  users,
} from "../../../database/schema";
import {
  type AssignDirectorSignatureCommand,
  type CreateEmpleadoRecordCommand,
  type CreateEmpleadoSignatureVersionCommand,
  type EmpleadoAuditCommand,
  type EmpleadoCommandRecord,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
  type EmpleadoTenantOptionRecord,
  type DirectorSignatureAssignmentRecord,
  type DirectorSignatureMonthResolutionRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadoSignatureVersionByIdQuery,
  type FindEmpleadosQuery,
  type ResolveDirectorSignatureForMonthQuery,
  type UpdateEmpleadoRecordCommand,
} from "../domain/empleado.types";
import { type EmpleadosRepository } from "../domain/empleados.repository";

type EmpleadoSelectionRow = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  email: string;
  fullName: string;
  firstName: string | null;
  middleName: string | null;
  firstSurname: string | null;
  secondSurname: string | null;
  documentNumber: string | null;
  phone: string | null;
  role: EmpleadoRecord["role"];
  isActive: boolean;
  isTenantOwner: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DrizzleEmpleadosRepository implements EmpleadosRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(query: FindEmpleadosQuery): Promise<EmpleadoRecord[]> {
    const rows = await this.database.db
      .select(this.getEmpleadoSelection())
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(this.buildWhere(query))
      .orderBy(asc(users.fullName));

    return rows.map((row) => this.toRecord(row));
  }

  async findById(query: FindEmpleadoByIdQuery): Promise<EmpleadoRecord | null> {
    const [row] = await this.database.db
      .select(this.getEmpleadoSelection())
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(this.buildScopedWhere(query.scope, [eq(users.id, query.id)]))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    const [latestSignature, currentDirectorSignatureAssignment] = await Promise.all([
      this.findLatestSignatureVersionByEmployeeId(row.id),
      this.findCurrentDirectorSignatureAssignmentByEmployeeId(row.id),
    ]);

    return this.toRecord(row, {
      latestSignature,
      currentDirectorSignatureAssignment,
    });
  }

  async findByEmail(query: FindEmpleadoByEmailQuery): Promise<EmpleadoRecord | null> {
    const conditions = [eq(users.email, query.email)];

    if (query.excludeId !== undefined) {
      conditions.push(ne(users.id, query.excludeId));
    }

    const [row] = await this.database.db
      .select(this.getEmpleadoSelection())
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findByDocument(query: FindEmpleadoByDocumentQuery): Promise<EmpleadoRecord | null> {
    const conditions =
      query.tenantId === null
        ? [isNull(users.tenantId), eq(users.documentNumber, query.documentNumber)]
        : [
            eq(users.tenantId, query.tenantId),
            eq(users.documentNumber, query.documentNumber),
          ];

    if (query.excludeId !== undefined) {
      conditions.push(ne(users.id, query.excludeId));
    }

    const [row] = await this.database.db
      .select(this.getEmpleadoSelection())
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findTenantOptions(): Promise<EmpleadoTenantOptionRecord[]> {
    return await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .orderBy(asc(tenants.name));
  }

  async findLatestSignatureVersionByEmployeeId(
    employeeId: string,
  ): Promise<EmpleadoSignatureVersionRecord | null> {
    const [row] = await this.database.db
      .select({
        id: employeeSignatureVersions.id,
        employeeId: employeeSignatureVersions.employeeId,
        tenantId: employeeSignatureVersions.tenantId,
        originalName: employeeSignatureVersions.originalName,
        mimeType: employeeSignatureVersions.mimeType,
        sizeBytes: employeeSignatureVersions.sizeBytes,
        checksum: employeeSignatureVersions.checksum,
        relativePath: employeeSignatureVersions.relativePath,
        createdAt: employeeSignatureVersions.createdAt,
      })
      .from(employeeSignatureVersions)
      .where(eq(employeeSignatureVersions.employeeId, employeeId))
      .orderBy(desc(employeeSignatureVersions.createdAt))
      .limit(1);

    return row === undefined ? null : row;
  }

  async findSignatureVersionById(
    query: FindEmpleadoSignatureVersionByIdQuery,
  ): Promise<EmpleadoSignatureVersionRecord | null> {
    const [row] = await this.database.db
      .select({
        id: employeeSignatureVersions.id,
        employeeId: employeeSignatureVersions.employeeId,
        tenantId: employeeSignatureVersions.tenantId,
        originalName: employeeSignatureVersions.originalName,
        mimeType: employeeSignatureVersions.mimeType,
        sizeBytes: employeeSignatureVersions.sizeBytes,
        checksum: employeeSignatureVersions.checksum,
        relativePath: employeeSignatureVersions.relativePath,
        createdAt: employeeSignatureVersions.createdAt,
      })
      .from(employeeSignatureVersions)
      .where(
        and(
          eq(employeeSignatureVersions.id, query.signatureVersionId),
          eq(employeeSignatureVersions.employeeId, query.employeeId),
        ),
      )
      .limit(1);

    return row === undefined ? null : row;
  }

  async findCurrentDirectorSignatureAssignmentByEmployeeId(
    employeeId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null> {
    const [row] = await this.database.db
      .select({
        id: tenantDirectorSignatureAssignments.id,
        tenantId: tenantDirectorSignatureAssignments.tenantId,
        employeeId: tenantDirectorSignatureAssignments.employeeId,
        signatureVersionId: tenantDirectorSignatureAssignments.signatureVersionId,
        effectiveFrom: tenantDirectorSignatureAssignments.effectiveFrom,
        effectiveTo: tenantDirectorSignatureAssignments.effectiveTo,
        createdAt: tenantDirectorSignatureAssignments.createdAt,
      })
      .from(tenantDirectorSignatureAssignments)
      .where(
        and(
          eq(tenantDirectorSignatureAssignments.employeeId, employeeId),
          isNull(tenantDirectorSignatureAssignments.effectiveTo),
        ),
      )
      .orderBy(
        desc(tenantDirectorSignatureAssignments.effectiveFrom),
        desc(tenantDirectorSignatureAssignments.createdAt),
      )
      .limit(1);

    return row === undefined ? null : row;
  }

  async findLatestDirectorSignatureAssignmentByTenantId(
    tenantId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null> {
    const [row] = await this.database.db
      .select({
        id: tenantDirectorSignatureAssignments.id,
        tenantId: tenantDirectorSignatureAssignments.tenantId,
        employeeId: tenantDirectorSignatureAssignments.employeeId,
        signatureVersionId: tenantDirectorSignatureAssignments.signatureVersionId,
        effectiveFrom: tenantDirectorSignatureAssignments.effectiveFrom,
        effectiveTo: tenantDirectorSignatureAssignments.effectiveTo,
        createdAt: tenantDirectorSignatureAssignments.createdAt,
      })
      .from(tenantDirectorSignatureAssignments)
      .where(eq(tenantDirectorSignatureAssignments.tenantId, tenantId))
      .orderBy(
        desc(tenantDirectorSignatureAssignments.effectiveFrom),
        desc(tenantDirectorSignatureAssignments.createdAt),
      )
      .limit(1);

    return row === undefined ? null : row;
  }

  async resolveDirectorSignatureForMonth(
    query: ResolveDirectorSignatureForMonthQuery,
  ): Promise<DirectorSignatureMonthResolutionRecord[]> {
    const monthRange = resolveInclusiveMonthRange(query.deliveryMonth);
    const rows = await this.database.db
      .select({
        assignmentId: tenantDirectorSignatureAssignments.id,
        assignmentTenantId: tenantDirectorSignatureAssignments.tenantId,
        assignmentEmployeeId: tenantDirectorSignatureAssignments.employeeId,
        assignmentSignatureVersionId: tenantDirectorSignatureAssignments.signatureVersionId,
        assignmentEffectiveFrom: tenantDirectorSignatureAssignments.effectiveFrom,
        assignmentEffectiveTo: tenantDirectorSignatureAssignments.effectiveTo,
        assignmentCreatedAt: tenantDirectorSignatureAssignments.createdAt,
        employeeFullName: users.fullName,
        employeeRole: users.role,
        signatureId: employeeSignatureVersions.id,
        signatureEmployeeId: employeeSignatureVersions.employeeId,
        signatureTenantId: employeeSignatureVersions.tenantId,
        signatureOriginalName: employeeSignatureVersions.originalName,
        signatureMimeType: employeeSignatureVersions.mimeType,
        signatureSizeBytes: employeeSignatureVersions.sizeBytes,
        signatureChecksum: employeeSignatureVersions.checksum,
        signatureRelativePath: employeeSignatureVersions.relativePath,
        signatureCreatedAt: employeeSignatureVersions.createdAt,
      })
      .from(tenantDirectorSignatureAssignments)
      .innerJoin(users, eq(users.id, tenantDirectorSignatureAssignments.employeeId))
      .innerJoin(
        employeeSignatureVersions,
        eq(employeeSignatureVersions.id, tenantDirectorSignatureAssignments.signatureVersionId),
      )
      .where(
        and(
          eq(tenantDirectorSignatureAssignments.tenantId, query.tenantId),
          lte(tenantDirectorSignatureAssignments.effectiveFrom, monthRange.endDateInclusive),
          or(
            isNull(tenantDirectorSignatureAssignments.effectiveTo),
            gte(tenantDirectorSignatureAssignments.effectiveTo, monthRange.startDate),
          )!,
        ),
      )
      .orderBy(
        desc(tenantDirectorSignatureAssignments.effectiveFrom),
        desc(tenantDirectorSignatureAssignments.createdAt),
      );

    return rows.map((row) => ({
      assignment: {
        id: row.assignmentId,
        tenantId: row.assignmentTenantId,
        employeeId: row.assignmentEmployeeId,
        signatureVersionId: row.assignmentSignatureVersionId,
        effectiveFrom: row.assignmentEffectiveFrom,
        effectiveTo: row.assignmentEffectiveTo,
        createdAt: row.assignmentCreatedAt,
      },
      employeeFullName: row.employeeFullName,
      employeeRole: row.employeeRole,
      signature: {
        id: row.signatureId,
        employeeId: row.signatureEmployeeId,
        tenantId: row.signatureTenantId,
        originalName: row.signatureOriginalName,
        mimeType: row.signatureMimeType,
        sizeBytes: row.signatureSizeBytes,
        checksum: row.signatureChecksum,
        relativePath: row.signatureRelativePath,
        createdAt: row.signatureCreatedAt,
      },
    }));
  }

  async create(
    command: CreateEmpleadoRecordCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoRecord> {
    const createdId = await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [created] = await tx
        .insert(users)
        .values({
          ...this.buildMutableValues(command),
          tenantId: command.tenantId,
          passwordHash: command.passwordHash,
          passwordSetByAdmin: true,
          isTenantOwner: false,
          isActive: command.isActive,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: users.id });

      if (created === undefined) {
        throw new Error("No fue posible crear el usuario.");
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit, created.id));

      return created.id;
    });

    return await this.getEmpleadoRecordByIdOrThrow(createdId, "No fue posible consultar el usuario creado.");
  }

  async update(
    command: UpdateEmpleadoRecordCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<EmpleadoRecord> {
    const updatedId = await this.database.db.transaction(async (tx) => {
      const updateValues: Partial<typeof users.$inferInsert> = {
        ...this.buildMutableValues(command),
        updatedAt: new Date(),
      };

      if (command.passwordHash !== undefined) {
        updateValues.passwordHash = command.passwordHash;
        updateValues.passwordSetByAdmin = true;
        updateValues.passwordChangedAt = null;
        updateValues.failedLoginAttempts = 0;
        updateValues.lockedUntil = null;
      }

      const [updated] = await tx
        .update(users)
        .set(updateValues)
        .where(eq(users.id, command.id))
        .returning({ id: users.id });

      if (updated === undefined) {
        throw new Error("No fue posible actualizar el usuario.");
      }

      await tx.insert(auditLogs).values(
        auditEntries.map((audit) => this.toAuditInsert(audit, command.id)),
      );

      return updated.id;
    });

    return await this.getEmpleadoRecordByIdOrThrow(
      updatedId,
      "No fue posible consultar el usuario actualizado.",
    );
  }

  async createSignatureVersion(
    command: CreateEmpleadoSignatureVersionCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoSignatureVersionRecord> {
    const createdId = await this.database.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(employeeSignatureVersions)
        .values({
          employeeId: command.employeeId,
          tenantId: command.tenantId,
          originalName: command.originalName,
          mimeType: command.mimeType,
          sizeBytes: command.sizeBytes,
          checksum: command.checksum,
          relativePath: command.relativePath,
          uploadedByUserId: command.uploadedByUserId,
          createdAt: new Date(),
        })
        .returning({ id: employeeSignatureVersions.id });

      if (created === undefined) {
        throw new Error("No fue posible guardar la firma del director.");
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit, command.employeeId));

      return created.id;
    });

    const signature = await this.getSignatureVersionById(createdId);

    if (signature === null) {
      throw new Error("No fue posible consultar la firma guardada.");
    }

    return signature;
  }

  async assignDirectorSignature(
    command: AssignDirectorSignatureCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<DirectorSignatureAssignmentRecord> {
    const createdId = await this.database.db.transaction(async (tx) => {
      const [currentActiveAssignment] = await tx
        .select({
          id: tenantDirectorSignatureAssignments.id,
        })
        .from(tenantDirectorSignatureAssignments)
        .where(
          and(
            eq(tenantDirectorSignatureAssignments.tenantId, command.tenantId),
            isNull(tenantDirectorSignatureAssignments.effectiveTo),
          ),
        )
        .orderBy(
          desc(tenantDirectorSignatureAssignments.effectiveFrom),
          desc(tenantDirectorSignatureAssignments.createdAt),
        )
        .limit(1);

      if (currentActiveAssignment !== undefined) {
        await tx
          .update(tenantDirectorSignatureAssignments)
          .set({
            effectiveTo: resolvePreviousDate(command.effectiveFrom),
          })
          .where(eq(tenantDirectorSignatureAssignments.id, currentActiveAssignment.id));
      }

      const [created] = await tx
        .insert(tenantDirectorSignatureAssignments)
        .values({
          tenantId: command.tenantId,
          employeeId: command.employeeId,
          signatureVersionId: command.signatureVersionId,
          effectiveFrom: command.effectiveFrom,
          createdByUserId: command.createdByUserId,
          createdAt: new Date(),
        })
        .returning({ id: tenantDirectorSignatureAssignments.id });

      if (created === undefined) {
        throw new Error("No fue posible guardar la vigencia de la firma del director.");
      }

      await tx.insert(auditLogs).values(
        auditEntries.map((audit) => this.toAuditInsert(audit, command.employeeId)),
      );

      return created.id;
    });

    const assignment = await this.getDirectorSignatureAssignmentById(createdId);

    if (assignment === null) {
      throw new Error("No fue posible consultar la vigencia de firma guardada.");
    }

    return assignment;
  }

  private buildWhere(query: FindEmpleadosQuery): SQL | undefined {
    const conditions = this.buildScopeConditions(query.scope);

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;
      const searchCondition = or(
        ilike(users.documentNumber, searchPattern),
        ilike(users.fullName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(users.phone, searchPattern),
        ilike(tenants.name, searchPattern),
      );

      if (searchCondition !== undefined) {
        conditions.push(searchCondition);
      }
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildScopedWhere(
    scope: FindEmpleadosQuery["scope"],
    extraConditions: SQL[],
  ): SQL | undefined {
    const conditions = [...this.buildScopeConditions(scope), ...extraConditions];

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildScopeConditions(scope: FindEmpleadosQuery["scope"]): SQL[] {
    if (scope.type === "tenant") {
      return [eq(users.tenantId, scope.tenantId)];
    }

    return [];
  }

  private getEmpleadoSelection() {
    return {
      id: users.id,
      tenantId: users.tenantId,
      tenantName: tenants.name,
      email: users.email,
      fullName: users.fullName,
      firstName: users.firstName,
      middleName: users.middleName,
      firstSurname: users.firstSurname,
      secondSurname: users.secondSurname,
      documentNumber: users.documentNumber,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      isTenantOwner: users.isTenantOwner,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    };
  }

  private buildMutableValues(command: Omit<EmpleadoCommandRecord, "tenantId" | "passwordHash">) {
    return {
      email: command.email,
      fullName: joinFullName(command),
      firstName: command.firstName,
      middleName: command.middleName,
      firstSurname: command.firstSurname,
      secondSurname: command.secondSurname,
      documentNumber: command.documentNumber,
      phone: command.phone,
      role: command.role,
      isActive: command.isActive,
    } satisfies Partial<typeof users.$inferInsert>;
  }

  private toAuditInsert(
    audit: EmpleadoAuditCommand,
    targetUserId: string,
  ): typeof auditLogs.$inferInsert {
    return {
      actorUserId: audit.actorUserId,
      action: audit.action,
      targetTenantId: audit.targetTenantId,
      targetUserId,
      summary: audit.summary,
      metadata: audit.metadata,
    };
  }

  private async getEmpleadoRecordByIdOrThrow(id: string, errorMessage: string): Promise<EmpleadoRecord> {
    const [row] = await this.database.db
      .select(this.getEmpleadoSelection())
      .from(users)
      .leftJoin(tenants, eq(tenants.id, users.tenantId))
      .where(eq(users.id, id))
      .limit(1);

    if (row === undefined) {
      throw new Error(errorMessage);
    }

    const [latestSignature, currentDirectorSignatureAssignment] = await Promise.all([
      this.findLatestSignatureVersionByEmployeeId(id),
      this.findCurrentDirectorSignatureAssignmentByEmployeeId(id),
    ]);

    return this.toRecord(row, {
      latestSignature,
      currentDirectorSignatureAssignment,
    });
  }

  private async getSignatureVersionById(
    signatureVersionId: string,
  ): Promise<EmpleadoSignatureVersionRecord | null> {
    const [row] = await this.database.db
      .select({
        id: employeeSignatureVersions.id,
        employeeId: employeeSignatureVersions.employeeId,
        tenantId: employeeSignatureVersions.tenantId,
        originalName: employeeSignatureVersions.originalName,
        mimeType: employeeSignatureVersions.mimeType,
        sizeBytes: employeeSignatureVersions.sizeBytes,
        checksum: employeeSignatureVersions.checksum,
        relativePath: employeeSignatureVersions.relativePath,
        createdAt: employeeSignatureVersions.createdAt,
      })
      .from(employeeSignatureVersions)
      .where(eq(employeeSignatureVersions.id, signatureVersionId))
      .limit(1);

    return row === undefined ? null : row;
  }

  private async getDirectorSignatureAssignmentById(
    assignmentId: string,
  ): Promise<DirectorSignatureAssignmentRecord | null> {
    const [row] = await this.database.db
      .select({
        id: tenantDirectorSignatureAssignments.id,
        tenantId: tenantDirectorSignatureAssignments.tenantId,
        employeeId: tenantDirectorSignatureAssignments.employeeId,
        signatureVersionId: tenantDirectorSignatureAssignments.signatureVersionId,
        effectiveFrom: tenantDirectorSignatureAssignments.effectiveFrom,
        effectiveTo: tenantDirectorSignatureAssignments.effectiveTo,
        createdAt: tenantDirectorSignatureAssignments.createdAt,
      })
      .from(tenantDirectorSignatureAssignments)
      .where(eq(tenantDirectorSignatureAssignments.id, assignmentId))
      .limit(1);

    return row === undefined ? null : row;
  }

  private toRecord(
    row: EmpleadoSelectionRow,
    relations?: {
      latestSignature?: EmpleadoSignatureVersionRecord | null;
      currentDirectorSignatureAssignment?: DirectorSignatureAssignmentRecord | null;
    },
  ): EmpleadoRecord {
    return {
      ...row,
      latestSignature: relations?.latestSignature ?? null,
      currentDirectorSignatureAssignment:
        relations?.currentDirectorSignatureAssignment ?? null,
    };
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function resolveInclusiveMonthRange(deliveryMonth: string): {
  startDate: string;
  endDateInclusive: string;
} {
  const [yearValue, monthValue] = deliveryMonth.split("-");

  if (yearValue === undefined || monthValue === undefined) {
    throw new Error("deliveryMonth invalido.");
  }

  const year = Number.parseInt(yearValue, 10);
  const month = Number.parseInt(monthValue, 10);
  const nextMonthDate =
    month === 12
      ? new Date(Date.UTC(year + 1, 0, 1))
      : new Date(Date.UTC(year, month, 1));

  nextMonthDate.setUTCDate(nextMonthDate.getUTCDate() - 1);

  return {
    startDate: `${yearValue}-${monthValue}-01`,
    endDateInclusive: nextMonthDate.toISOString().slice(0, 10),
  };
}

function resolvePreviousDate(dateValue: string): string {
  const currentDate = new Date(`${dateValue}T00:00:00.000Z`);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  return currentDate.toISOString().slice(0, 10);
}

function joinFullName(command: {
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
}): string {
  return [
    command.firstName,
    command.middleName,
    command.firstSurname,
    command.secondSurname,
  ]
    .filter((namePart): namePart is string => namePart !== null && namePart.trim() !== "")
    .join(" ");
}
