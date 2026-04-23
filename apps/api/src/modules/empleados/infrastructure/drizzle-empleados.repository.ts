import { Injectable } from "@nestjs/common";
import { and, asc, eq, ilike, isNull, ne, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { auditLogs, tenants, users } from "../../../database/schema";
import {
  type CreateEmpleadoRecordCommand,
  type EmpleadoAuditCommand,
  type EmpleadoCommandRecord,
  type EmpleadoRecord,
  type EmpleadoTenantOptionRecord,
  type FindEmpleadoByDocumentQuery,
  type FindEmpleadoByEmailQuery,
  type FindEmpleadoByIdQuery,
  type FindEmpleadosQuery,
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

    return row === undefined ? null : this.toRecord(row);
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

  async create(
    command: CreateEmpleadoRecordCommand,
    audit: EmpleadoAuditCommand,
  ): Promise<EmpleadoRecord> {
    return await this.database.db.transaction(async (tx) => {
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

      const [row] = await tx
        .select(this.getEmpleadoSelection())
        .from(users)
        .leftJoin(tenants, eq(tenants.id, users.tenantId))
        .where(eq(users.id, created.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar el usuario creado.");
      }

      return this.toRecord(row);
    });
  }

  async update(
    command: UpdateEmpleadoRecordCommand,
    auditEntries: EmpleadoAuditCommand[],
  ): Promise<EmpleadoRecord> {
    return await this.database.db.transaction(async (tx) => {
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

      const [row] = await tx
        .select(this.getEmpleadoSelection())
        .from(users)
        .leftJoin(tenants, eq(tenants.id, users.tenantId))
        .where(eq(users.id, updated.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar el usuario actualizado.");
      }

      return this.toRecord(row);
    });
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

  private toRecord(row: EmpleadoSelectionRow): EmpleadoRecord {
    return row;
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
