import {
  type AuthUser,
  type CreatePsicologiaSessionRequest,
  createPsicologiaSessionRequestSchema,
  type PsicologiaAdultoListQuery,
  psicologiaAdultoListResponseSchema,
  type PsicologiaHistoryResponse,
  psicologiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, sql, type SQLWrapper } from "drizzle-orm";

import { calculateAgeFromBirthDate } from "../../adultos-mayores/application/age";
import { assertAdultoMayorRecordDateAllowed } from "../../adultos-mayores/domain/adulto-mayor-status-policy";
import { DatabaseService } from "../../../database/database.service";
import { adultosMayores, psicologiaSessions, tenants, users } from "../../../database/schema";

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
export class PsicologiaService {
  constructor(private readonly database: DatabaseService) {}

  async listAdultosMayores(query: PsicologiaAdultoListQuery, actor: AuthUser) {
    const scope = this.ensureReadAccess(actor);
    const searchPattern =
      query.search === null
        ? null
        : `%${query.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const where = and(
      this.scopeCondition(adultosMayores.tenantId, scope),
      sql`${adultosMayores.deletedAt} is null`,
      searchPattern === null
        ? undefined
        : or(
            ilike(adultosMayores.names, searchPattern),
            ilike(adultosMayores.surnames, searchPattern),
            ilike(adultosMayores.documentNumber, searchPattern),
            ilike(adultosMayores.phone, searchPattern),
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

    return psicologiaAdultoListResponseSchema.parse({
      adultosMayores: rows.map((row) => this.toAdulto(row)),
      total: totals[0]?.total ?? 0,
    });
  }

  async getHistory(adultoMayorId: string, actor: AuthUser): Promise<PsicologiaHistoryResponse> {
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
        id: psicologiaSessions.id,
        tenantId: psicologiaSessions.tenantId,
        adultoMayorId: psicologiaSessions.adultoMayorId,
        sessionDate: psicologiaSessions.sessionDate,
        modality: psicologiaSessions.modality,
        reason: psicologiaSessions.reason,
        assessment: psicologiaSessions.assessment,
        intervention: psicologiaSessions.intervention,
        agreements: psicologiaSessions.agreements,
        nextSessionDate: psicologiaSessions.nextSessionDate,
        createdByUserId: psicologiaSessions.createdByUserId,
        version: psicologiaSessions.version,
        createdAt: psicologiaSessions.createdAt,
        updatedAt: psicologiaSessions.updatedAt,
        professionalFullName: users.fullName,
        professionalRole: users.role,
      })
      .from(psicologiaSessions)
      .innerJoin(users, eq(users.id, psicologiaSessions.createdByUserId))
      .where(
        and(
          eq(psicologiaSessions.adultoMayorId, adultoMayorId),
          this.scopeCondition(psicologiaSessions.tenantId, scope),
        ),
      )
      .orderBy(desc(psicologiaSessions.sessionDate), desc(psicologiaSessions.createdAt));

    return psicologiaHistoryResponseSchema.parse({
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

  async createSession(command: CreatePsicologiaSessionRequest, actor: AuthUser) {
    this.ensureCreateAccess(actor);
    const scope = this.resolveScope(actor);
    const session = createPsicologiaSessionRequestSchema.parse(command);
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
    await this.database.db.insert(psicologiaSessions).values({
      ...session,
      tenantId: adulto.tenantId,
      createdByUserId: actor.id,
      updatedByUserId: actor.id,
    });
    return this.getHistory(session.adultoMayorId, actor);
  }

  private ensureReadAccess(actor: AuthUser): Scope {
    if (!this.canRead(actor))
      throw new ForbiddenException("No puedes consultar sesiones de psicología.");
    return this.resolveScope(actor);
  }

  private ensureCreateAccess(actor: AuthUser) {
    const permitted =
      actor.permissions === undefined
        ? ["super_admin", "admin", "director", "psicologo"].includes(actor.role)
        : actor.permissions.includes("psicologia.create");
    if (!permitted) throw new ForbiddenException("No puedes registrar sesiones de psicología.");
  }

  private canRead(actor: AuthUser) {
    return actor.permissions === undefined
      ? ["super_admin", "admin", "auditor", "director", "psicologo"].includes(actor.role)
      : actor.permissions.includes("psicologia.view");
  }

  private resolveScope(actor: AuthUser): Scope {
    if (actor.role === "super_admin") return { type: "all" };
    if (actor.tenantId === null)
      throw new ForbiddenException("El usuario no tiene un centro asignado.");
    return { type: "tenant", tenantId: actor.tenantId };
  }

  private canEdit(actor: AuthUser, tenantId: string, createdByUserId: string) {
    if (actor.role !== "super_admin" && actor.tenantId !== tenantId) return false;
    if (actor.permissions !== undefined)
      return (
        actor.permissions.includes("psicologia.manage") ||
        (actor.id === createdByUserId && actor.permissions.includes("psicologia.edit_own"))
      );
    return (
      ["super_admin", "admin", "director"].includes(actor.role) ||
      (actor.role === "psicologo" && actor.id === createdByUserId)
    );
  }

  private scopeCondition(
    column: typeof adultosMayores.tenantId | typeof psicologiaSessions.tenantId,
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
