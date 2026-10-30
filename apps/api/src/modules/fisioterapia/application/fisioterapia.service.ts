import {
  type AuthUser,
  type CreateFisioterapiaSessionRequest,
  createFisioterapiaSessionRequestSchema,
  type FisioterapiaAdultoListQuery,
  fisioterapiaAdultoListResponseSchema,
  type FisioterapiaHistoryResponse,
  fisioterapiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, sql, type SQLWrapper } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { adultosMayores, fisioterapiaSessions, tenants, users } from "../../../database/schema";
import { calculateAgeFromBirthDate } from "../../adultos-mayores/application/age";
import { assertAdultoMayorRecordDateAllowed } from "../../adultos-mayores/domain/adulto-mayor-status-policy";

type Scope = { type: "all" } | { type: "tenant"; tenantId: string };
type AdultoRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: "cc" | "ce" | "passport" | "other";
  documentNumber: string;
  names: string;
  surnames: string;
  phone: string | null;
  birthDate: string;
  sex: "female" | "male" | "other";
  eps: string | null;
};

@Injectable()
export class FisioterapiaService {
  constructor(private readonly database: DatabaseService) {}

  async listAdultosMayores(query: FisioterapiaAdultoListQuery, actor: AuthUser) {
    const scope = this.ensureReadAccess(actor);
    const search =
      query.search === null
        ? null
        : `%${query.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const where = and(
      this.scopeCondition(adultosMayores.tenantId, scope),
      sql`${adultosMayores.deletedAt} is null`,
      search === null
        ? undefined
        : or(
            ilike(adultosMayores.names, search),
            ilike(adultosMayores.surnames, search),
            ilike(adultosMayores.documentNumber, search),
            ilike(adultosMayores.phone, search),
          ),
    );
    const [rows, totals] = await Promise.all([
      this.database.db
        .select(this.adultoSelection())
        .from(adultosMayores)
        .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
        .where(where)
        .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.database.db.select({ total: count() }).from(adultosMayores).where(where),
    ]);
    return fisioterapiaAdultoListResponseSchema.parse({
      adultosMayores: rows.map((row) => this.toAdulto(row)),
      total: totals[0]?.total ?? 0,
    });
  }

  async getHistory(adultoMayorId: string, actor: AuthUser): Promise<FisioterapiaHistoryResponse> {
    const scope = this.ensureReadAccess(actor);
    const [adulto] = await this.database.db
      .select(this.adultoSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .where(
        and(
          eq(adultosMayores.id, adultoMayorId),
          this.scopeCondition(adultosMayores.tenantId, scope),
          sql`${adultosMayores.deletedAt} is null`,
        ),
      )
      .limit(1);
    if (adulto === undefined) throw new NotFoundException("Adulto mayor no encontrado.");
    const sessions = await this.database.db
      .select({
        id: fisioterapiaSessions.id,
        tenantId: fisioterapiaSessions.tenantId,
        adultoMayorId: fisioterapiaSessions.adultoMayorId,
        sessionDate: fisioterapiaSessions.sessionDate,
        modality: fisioterapiaSessions.modality,
        reason: fisioterapiaSessions.reason,
        functionalAssessment: fisioterapiaSessions.functionalAssessment,
        intervention: fisioterapiaSessions.intervention,
        evolution: fisioterapiaSessions.evolution,
        nextSessionDate: fisioterapiaSessions.nextSessionDate,
        createdByUserId: fisioterapiaSessions.createdByUserId,
        version: fisioterapiaSessions.version,
        createdAt: fisioterapiaSessions.createdAt,
        updatedAt: fisioterapiaSessions.updatedAt,
        professionalFullName: users.fullName,
        professionalRole: users.role,
      })
      .from(fisioterapiaSessions)
      .innerJoin(users, eq(users.id, fisioterapiaSessions.createdByUserId))
      .where(
        and(
          eq(fisioterapiaSessions.adultoMayorId, adultoMayorId),
          this.scopeCondition(fisioterapiaSessions.tenantId, scope),
        ),
      )
      .orderBy(desc(fisioterapiaSessions.sessionDate), desc(fisioterapiaSessions.createdAt));
    return fisioterapiaHistoryResponseSchema.parse({
      adultoMayor: this.toAdulto(adulto),
      sessions: sessions.map((session) => ({
        ...session,
        professional: {
          userId: session.createdByUserId,
          fullName: session.professionalFullName,
          role: session.professionalRole,
        },
        access: this.canEdit(actor, session.tenantId, session.createdByUserId) ? "edit" : "view",
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      })),
    });
  }

  async createSession(command: CreateFisioterapiaSessionRequest, actor: AuthUser) {
    this.ensureCreateAccess(actor);
    const scope = this.resolveScope(actor);
    const session = createFisioterapiaSessionRequestSchema.parse(command);
    const [adulto] = await this.database.db
      .select({
        tenantId: adultosMayores.tenantId,
        status: adultosMayores.status,
        deathDate: adultosMayores.deathDate,
      })
      .from(adultosMayores)
      .where(
        and(
          eq(adultosMayores.id, session.adultoMayorId),
          this.scopeCondition(adultosMayores.tenantId, scope),
          sql`${adultosMayores.deletedAt} is null`,
        ),
      )
      .limit(1);
    if (adulto === undefined) throw new NotFoundException("Adulto mayor no encontrado.");
    assertAdultoMayorRecordDateAllowed({
      status: adulto.status,
      deathDate: adulto.deathDate,
      recordDate: session.sessionDate,
    });
    await this.database.db
      .insert(fisioterapiaSessions)
      .values({
        ...session,
        tenantId: adulto.tenantId,
        createdByUserId: actor.id,
        updatedByUserId: actor.id,
      });
    return this.getHistory(session.adultoMayorId, actor);
  }

  private ensureReadAccess(actor: AuthUser): Scope {
    if (!this.canRead(actor))
      throw new ForbiddenException("No puedes consultar atenciones de fisioterapia.");
    return this.resolveScope(actor);
  }
  private ensureCreateAccess(actor: AuthUser) {
    const allowed =
      actor.permissions === undefined
        ? ["super_admin", "admin", "director", "fisioterapeuta"].includes(actor.role)
        : actor.permissions.includes("fisioterapia.create");
    if (!allowed) throw new ForbiddenException("No puedes registrar sesiones de fisioterapia.");
  }
  private canRead(actor: AuthUser) {
    return actor.permissions === undefined
      ? ["super_admin", "admin", "auditor", "director", "fisioterapeuta"].includes(actor.role)
      : actor.permissions.includes("fisioterapia.view");
  }
  private resolveScope(actor: AuthUser): Scope {
    if (actor.role === "super_admin") return { type: "all" };
    if (actor.tenantId === null)
      throw new ForbiddenException("El usuario no tiene un centro asignado.");
    return { type: "tenant", tenantId: actor.tenantId };
  }
  private canEdit(actor: AuthUser, tenantId: string, createdByUserId: string) {
    if (actor.role !== "super_admin" && actor.tenantId !== tenantId) return false;
    return actor.permissions === undefined
      ? ["super_admin", "admin", "director"].includes(actor.role) ||
          (actor.role === "fisioterapeuta" && actor.id === createdByUserId)
      : actor.permissions.includes("fisioterapia.manage") ||
          (actor.id === createdByUserId && actor.permissions.includes("fisioterapia.edit_own"));
  }
  private scopeCondition(
    column: typeof adultosMayores.tenantId | typeof fisioterapiaSessions.tenantId,
    scope: Scope,
  ): SQLWrapper | undefined {
    return scope.type === "all" ? undefined : eq(column, scope.tenantId);
  }
  private adultoSelection() {
    return {
      id: adultosMayores.id,
      tenantId: adultosMayores.tenantId,
      tenantName: tenants.name,
      documentType: adultosMayores.documentType,
      documentNumber: adultosMayores.documentNumber,
      names: adultosMayores.names,
      surnames: adultosMayores.surnames,
      phone: adultosMayores.phone,
      birthDate: adultosMayores.birthDate,
      sex: adultosMayores.sex,
      eps: adultosMayores.eps,
    };
  }
  private toAdulto(adulto: AdultoRow) {
    return {
      id: adulto.id,
      tenantId: adulto.tenantId,
      tenantName: adulto.tenantName,
      documentType: adulto.documentType,
      documentNumber: adulto.documentNumber,
      fullName: `${adulto.names} ${adulto.surnames}`.trim(),
      phone: adulto.phone,
      age: calculateAgeFromBirthDate(adulto.birthDate),
      sex: adulto.sex,
      eps: adulto.eps,
    };
  }
}
