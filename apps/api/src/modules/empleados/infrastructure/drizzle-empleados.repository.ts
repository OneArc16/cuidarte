import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, isNull, ne, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  auditLogs,
  employeeSignatureVersions,
  tenantActiveSigners,
  tenantDirectorSignatureAssignments,
  tenants,
  users,
} from "../../../database/schema";
import {
  type CreateEmpleadoRecordCommand,
  type CreateEmpleadoSignatureVersionCommand,
  type ClearTenantActiveSignerCommand,
  type EmpleadoAuditCommand,
  type EmpleadoCommandRecord,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
  type EmpleadoTenantOptionRecord,
  type DirectorSignatureAssignmentRecord,
  type DirectorSignatureAssignmentHistoryRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadoSignatureVersionByIdQuery,
  type FindEmpleadosQuery,
  type SetTenantActiveSignerCommand,
  type TenantActiveSignerRecord,
  type TenantActiveSignerResolutionRecord,
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

    const [
      latestSignature,
      tenantActiveSigner,
      currentDirectorSignatureAssignment,
      directorSignatureAssignmentHistory,
    ] = await Promise.all([
      this.findLatestSignatureVersionByEmployeeId(row.id),
      row.tenantId === null ? Promise.resolve(null) : this.findTenantActiveSignerByTenantId(row.tenantId),
      this.findCurrentDirectorSignatureAssignmentByEmployeeId(row.id),
      row.tenantId === null || row.role !== "director"
        ? Promise.resolve([])
        : this.findDirectorSignatureAssignmentHistoryByTenantId(row.tenantId),
    ]);

    return this.toRecord(row, {
      latestSignature,
      tenantActiveSigner,
      currentDirectorSignatureAssignment,
      directorSignatureAssignmentHistory,
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

  async findTenantActiveSignerByTenantId(
    tenantId: string,
  ): Promise<TenantActiveSignerRecord | null> {
    const [row] = await this.database.db
      .select({
        tenantId: tenantActiveSigners.tenantId,
        employeeId: tenantActiveSigners.employeeId,
        signatureVersionId: tenantActiveSigners.signatureVersionId,
        activatedByUserId: tenantActiveSigners.activatedByUserId,
        activatedAt: tenantActiveSigners.activatedAt,
        updatedAt: tenantActiveSigners.updatedAt,
      })
      .from(tenantActiveSigners)
      .where(eq(tenantActiveSigners.tenantId, tenantId))
      .limit(1);

    return row === undefined ? null : row;
  }

  async resolveTenantActiveDirectorSignatureByTenantId(
    tenantId: string,
  ): Promise<TenantActiveSignerResolutionRecord | null> {
    const [row] = await this.database.db
      .select({
        tenantId: tenantActiveSigners.tenantId,
        employeeId: tenantActiveSigners.employeeId,
        signatureVersionId: tenantActiveSigners.signatureVersionId,
        activatedByUserId: tenantActiveSigners.activatedByUserId,
        activatedAt: tenantActiveSigners.activatedAt,
        updatedAt: tenantActiveSigners.updatedAt,
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
      .from(tenantActiveSigners)
      .innerJoin(users, eq(users.id, tenantActiveSigners.employeeId))
      .innerJoin(
        employeeSignatureVersions,
        eq(employeeSignatureVersions.id, tenantActiveSigners.signatureVersionId),
      )
      .where(eq(tenantActiveSigners.tenantId, tenantId))
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return {
      activeSigner: {
        tenantId: row.tenantId,
        employeeId: row.employeeId,
        signatureVersionId: row.signatureVersionId,
        activatedByUserId: row.activatedByUserId,
        activatedAt: row.activatedAt,
        updatedAt: row.updatedAt,
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
    };
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

  async findDirectorSignatureAssignmentHistoryByTenantId(
    tenantId: string,
  ): Promise<DirectorSignatureAssignmentHistoryRecord[]> {
    return await this.database.db
      .select({
        id: tenantDirectorSignatureAssignments.id,
        tenantId: tenantDirectorSignatureAssignments.tenantId,
        employeeId: tenantDirectorSignatureAssignments.employeeId,
        signatureVersionId: tenantDirectorSignatureAssignments.signatureVersionId,
        effectiveFrom: tenantDirectorSignatureAssignments.effectiveFrom,
        effectiveTo: tenantDirectorSignatureAssignments.effectiveTo,
        createdAt: tenantDirectorSignatureAssignments.createdAt,
        employeeFullName: users.fullName,
        signatureOriginalName: employeeSignatureVersions.originalName,
      })
      .from(tenantDirectorSignatureAssignments)
      .innerJoin(users, eq(users.id, tenantDirectorSignatureAssignments.employeeId))
      .innerJoin(
        employeeSignatureVersions,
        eq(employeeSignatureVersions.id, tenantDirectorSignatureAssignments.signatureVersionId),
      )
      .where(eq(tenantDirectorSignatureAssignments.tenantId, tenantId))
      .orderBy(
        desc(tenantDirectorSignatureAssignments.effectiveFrom),
        desc(tenantDirectorSignatureAssignments.createdAt),
      );
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

  async setTenantActiveSigner(
    command: SetTenantActiveSignerCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<TenantActiveSignerRecord> {
    const activeSigner = await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const values = {
        tenantId: command.tenantId,
        employeeId: command.employeeId,
        signatureVersionId: command.signatureVersionId,
        activatedByUserId: command.activatedByUserId,
        activatedAt: now,
        updatedAt: now,
      } satisfies typeof tenantActiveSigners.$inferInsert;

      const [savedRow] = await tx
        .insert(tenantActiveSigners)
        .values(values)
        .onConflictDoUpdate({
          target: tenantActiveSigners.tenantId,
          set: {
            employeeId: values.employeeId,
            signatureVersionId: values.signatureVersionId,
            activatedByUserId: values.activatedByUserId,
            activatedAt: values.activatedAt,
            updatedAt: values.updatedAt,
          },
        })
        .returning({
          tenantId: tenantActiveSigners.tenantId,
          employeeId: tenantActiveSigners.employeeId,
          signatureVersionId: tenantActiveSigners.signatureVersionId,
          activatedByUserId: tenantActiveSigners.activatedByUserId,
          activatedAt: tenantActiveSigners.activatedAt,
          updatedAt: tenantActiveSigners.updatedAt,
        });

      if (savedRow === undefined) {
        throw new Error("No fue posible guardar el firmante activo del centro.");
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit, command.employeeId));

      return savedRow;
    });

    return activeSigner;
  }

  async clearTenantActiveSigner(
    command: ClearTenantActiveSignerCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<TenantActiveSignerRecord | null> {
    const activeSigner = await this.database.db.transaction(async (tx) => {
      const [deletedRow] = await tx
        .delete(tenantActiveSigners)
        .where(eq(tenantActiveSigners.tenantId, command.tenantId))
        .returning({
          tenantId: tenantActiveSigners.tenantId,
          employeeId: tenantActiveSigners.employeeId,
          signatureVersionId: tenantActiveSigners.signatureVersionId,
          activatedByUserId: tenantActiveSigners.activatedByUserId,
          activatedAt: tenantActiveSigners.activatedAt,
          updatedAt: tenantActiveSigners.updatedAt,
        });

      if (deletedRow === undefined) {
        return null;
      }

      await tx.insert(auditLogs).values(this.toAuditInsert(audit, deletedRow.employeeId));

      return deletedRow;
    });

    return activeSigner;
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

    const [
      latestSignature,
      tenantActiveSigner,
      currentDirectorSignatureAssignment,
      directorSignatureAssignmentHistory,
    ] = await Promise.all([
      this.findLatestSignatureVersionByEmployeeId(id),
      row.tenantId === null ? Promise.resolve(null) : this.findTenantActiveSignerByTenantId(row.tenantId),
      this.findCurrentDirectorSignatureAssignmentByEmployeeId(id),
      row.tenantId === null || row.role !== "director"
        ? Promise.resolve([])
        : this.findDirectorSignatureAssignmentHistoryByTenantId(row.tenantId),
    ]);

    return this.toRecord(row, {
      latestSignature,
      tenantActiveSigner,
      currentDirectorSignatureAssignment,
      directorSignatureAssignmentHistory,
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
      tenantActiveSigner?: TenantActiveSignerRecord | null;
      currentDirectorSignatureAssignment?: DirectorSignatureAssignmentRecord | null;
      directorSignatureAssignmentHistory?: DirectorSignatureAssignmentHistoryRecord[];
    },
  ): EmpleadoRecord {
    return {
      ...row,
      latestSignature: relations?.latestSignature ?? null,
      tenantActiveSigner: relations?.tenantActiveSigner ?? null,
      currentDirectorSignatureAssignment:
        relations?.currentDirectorSignatureAssignment ?? null,
      directorSignatureAssignmentHistory:
        relations?.directorSignatureAssignmentHistory ?? [],
    };
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
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
