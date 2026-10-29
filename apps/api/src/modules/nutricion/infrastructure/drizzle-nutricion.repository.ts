import { Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, or, sql, type SQLWrapper } from "drizzle-orm";
import {
  type NutricionFollowUpAdherence,
  type NutricionMealSlot,
  type NutricionPlanStatus,
  type UserRole,
} from "@cuidarte/contracts";

import {
  adultosMayores,
  nutricionFollowUps,
  nutricionPlanMeals,
  nutricionPlans,
  tenants,
  users,
} from "../../../database/schema";
import { DatabaseService } from "../../../database/database.service";
import { NUTRICION_REPOSITORY, type NutricionRepository } from "../domain/nutricion.repository";
import {
  type CreateNutricionFollowUpRecordCommand,
  type CreateNutricionPlanRecordCommand,
  type NutricionAdultoRecord,
  type NutricionFollowUpRecord,
  type NutricionPlanListRecord,
  type NutricionPlanRecord,
  type NutricionScope,
  type UpdateNutricionFollowUpRecordCommand,
  type UpdateNutricionPlanRecordCommand,
} from "../domain/nutricion.types";

type AdultoRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentNumber: string;
  names: string;
  surnames: string;
  phone: string | null;
  birthDate: string;
  sex: string;
  eps: string | null;
  healthRegime: string | null;
  status: "alive" | "deceased";
  deathDate: string | null;
};

type PlanRow = AdultoRow & {
  planId: string;
  startDate: string;
  nextFollowUpDate: string | null;
  planStatus: NutricionPlanStatus;
  assessment: string;
  goal: string;
  recommendations: string;
  restrictions: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  professionalFullName: string;
  professionalRole: UserRole;
};

@Injectable()
export class DrizzleNutricionRepository implements NutricionRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAdultoMayorById(query: {
    adultoMayorId: string;
    scope: NutricionScope;
  }): Promise<NutricionAdultoRecord | null> {
    const [row] = await this.database.db
      .select(this.adultoSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .where(
        and(
          eq(adultosMayores.id, query.adultoMayorId),
          this.scopeCondition(adultosMayores.tenantId, query.scope),
          sql`${adultosMayores.deletedAt} is null`,
        ),
      )
      .limit(1);

    return row === undefined ? null : this.toAdulto(row);
  }

  async findAdultosMayores(query: {
    scope: NutricionScope;
    search: string | null;
    page: number;
    pageSize: number;
  }): Promise<{ adultosMayores: NutricionAdultoRecord[]; total: number }> {
    const pattern =
      query.search === null
        ? null
        : `%${query.search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const searchCondition =
      pattern === null
        ? undefined
        : or(
            ilike(adultosMayores.names, pattern),
            ilike(adultosMayores.surnames, pattern),
            ilike(adultosMayores.documentNumber, pattern),
            ilike(adultosMayores.phone, pattern),
          );
    const where = and(
      this.scopeCondition(adultosMayores.tenantId, query.scope),
      sql`${adultosMayores.deletedAt} is null`,
      searchCondition,
    );
    const offset = (query.page - 1) * query.pageSize;
    const [rows, totalRows] = await Promise.all([
      this.database.db
        .select(this.adultoSelection())
        .from(adultosMayores)
        .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
        .where(where)
        .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names))
        .limit(query.pageSize)
        .offset(offset),
      this.database.db.select({ total: count() }).from(adultosMayores).where(where),
    ]);

    return {
      adultosMayores: rows.map((row) => this.toAdulto(row)),
      total: totalRows[0]?.total ?? 0,
    };
  }

  async findPlansByAdultoMayor(query: {
    adultoMayorId: string;
    scope: NutricionScope;
  }): Promise<NutricionPlanListRecord[]> {
    const rows = await this.planQuery()
      .where(
        and(
          this.scopeCondition(nutricionPlans.tenantId, query.scope),
          eq(nutricionPlans.adultoMayorId, query.adultoMayorId),
          sql`${adultosMayores.deletedAt} is null`,
        ),
      )
      .orderBy(desc(nutricionPlans.startDate), desc(nutricionPlans.updatedAt));

    return rows.map((row) => this.toPlan(row, []));
  }

  async findPlanById(query: {
    id: string;
    scope: NutricionScope;
  }): Promise<NutricionPlanRecord | null> {
    const [row] = await this.planQuery()
      .where(
        and(
          this.scopeCondition(nutricionPlans.tenantId, query.scope),
          eq(nutricionPlans.id, query.id),
          sql`${adultosMayores.deletedAt} is null`,
        ),
      )
      .limit(1);

    if (row === undefined) {
      return null;
    }

    const meals = await this.database.db
      .select({
        id: nutricionPlanMeals.id,
        slot: nutricionPlanMeals.slot,
        instruction: nutricionPlanMeals.instruction,
        portion: nutricionPlanMeals.portion,
        frequency: nutricionPlanMeals.frequency,
        sortOrder: nutricionPlanMeals.sortOrder,
      })
      .from(nutricionPlanMeals)
      .where(eq(nutricionPlanMeals.planId, row.planId))
      .orderBy(asc(nutricionPlanMeals.sortOrder));

    return this.toPlan(
      row,
      meals.map((meal) => ({ ...meal, slot: meal.slot as NutricionMealSlot })),
    );
  }

  async findFollowUpsByPlanId(query: {
    planId: string;
    scope: NutricionScope;
  }): Promise<NutricionFollowUpRecord[]> {
    const rows = await this.followUpQuery()
      .where(
        and(
          this.scopeCondition(nutricionFollowUps.tenantId, query.scope),
          eq(nutricionFollowUps.planId, query.planId),
        ),
      )
      .orderBy(desc(nutricionFollowUps.followUpDate), desc(nutricionFollowUps.createdAt));

    return rows.map((row) => this.toFollowUp(row));
  }

  async findFollowUpById(query: {
    id: string;
    scope: NutricionScope;
  }): Promise<NutricionFollowUpRecord | null> {
    const [row] = await this.followUpQuery()
      .where(
        and(
          this.scopeCondition(nutricionFollowUps.tenantId, query.scope),
          eq(nutricionFollowUps.id, query.id),
        ),
      )
      .limit(1);

    return row === undefined ? null : this.toFollowUp(row);
  }

  async createPlan(command: CreateNutricionPlanRecordCommand): Promise<{ id: string }> {
    return this.database.db.transaction(async (transaction) => {
      await transaction
        .update(nutricionPlans)
        .set({
          status: "archived",
          updatedByUserId: command.actorUserId,
          updatedAt: new Date(),
          version: sql`${nutricionPlans.version} + 1`,
        })
        .where(
          and(
            eq(nutricionPlans.tenantId, command.tenantId),
            eq(nutricionPlans.adultoMayorId, command.adultoMayorId),
            eq(nutricionPlans.status, "active"),
          ),
        );

      const [plan] = await transaction
        .insert(nutricionPlans)
        .values({
          tenantId: command.tenantId,
          adultoMayorId: command.adultoMayorId,
          startDate: command.startDate,
          nextFollowUpDate: command.nextFollowUpDate,
          status: command.status,
          assessment: command.assessment,
          goal: command.goal,
          recommendations: command.recommendations,
          restrictions: command.restrictions,
          createdByUserId: command.actorUserId,
          updatedByUserId: command.actorUserId,
        })
        .returning({ id: nutricionPlans.id });

      if (plan === undefined) {
        throw new Error("No fue posible crear el plan nutricional.");
      }

      await transaction.insert(nutricionPlanMeals).values(
        command.meals.map((meal, index) => ({
          planId: plan.id,
          slot: meal.slot,
          instruction: meal.instruction,
          portion: meal.portion,
          frequency: meal.frequency,
          sortOrder: index,
        })),
      );

      return plan;
    });
  }

  async updatePlan(command: UpdateNutricionPlanRecordCommand): Promise<boolean> {
    return this.database.db.transaction(async (transaction) => {
      const [updated] = await transaction
        .update(nutricionPlans)
        .set({
          startDate: command.startDate,
          nextFollowUpDate: command.nextFollowUpDate,
          status: command.status,
          assessment: command.assessment,
          goal: command.goal,
          recommendations: command.recommendations,
          restrictions: command.restrictions,
          updatedByUserId: command.actorUserId,
          updatedAt: new Date(),
          version: sql`${nutricionPlans.version} + 1`,
        })
        .where(
          and(
            eq(nutricionPlans.id, command.id),
            eq(nutricionPlans.tenantId, command.tenantId),
            eq(nutricionPlans.version, command.version),
          ),
        )
        .returning({ id: nutricionPlans.id });

      if (updated === undefined) {
        return false;
      }

      await transaction.delete(nutricionPlanMeals).where(eq(nutricionPlanMeals.planId, command.id));
      await transaction.insert(nutricionPlanMeals).values(
        command.meals.map((meal, index) => ({
          planId: command.id,
          slot: meal.slot,
          instruction: meal.instruction,
          portion: meal.portion,
          frequency: meal.frequency,
          sortOrder: index,
        })),
      );

      return true;
    });
  }

  async createFollowUp(command: CreateNutricionFollowUpRecordCommand): Promise<{ id: string }> {
    const [created] = await this.database.db
      .insert(nutricionFollowUps)
      .values({
        tenantId: command.tenantId,
        planId: command.planId,
        followUpDate: command.followUpDate,
        weightKg: command.weightKg,
        heightCm: command.heightCm,
        bodyMassIndex: command.bodyMassIndex,
        abdominalPerimeterCm: command.abdominalPerimeterCm,
        adherence: command.adherence,
        progressNote: command.progressNote,
        adjustments: command.adjustments,
        nextFollowUpDate: command.nextFollowUpDate,
        createdByUserId: command.actorUserId,
        updatedByUserId: command.actorUserId,
      })
      .returning({ id: nutricionFollowUps.id });

    if (created === undefined) {
      throw new Error("No fue posible crear el seguimiento nutricional.");
    }

    return created;
  }

  async updateFollowUp(command: UpdateNutricionFollowUpRecordCommand): Promise<boolean> {
    const [updated] = await this.database.db
      .update(nutricionFollowUps)
      .set({
        followUpDate: command.followUpDate,
        weightKg: command.weightKg,
        heightCm: command.heightCm,
        bodyMassIndex: command.bodyMassIndex,
        abdominalPerimeterCm: command.abdominalPerimeterCm,
        adherence: command.adherence,
        progressNote: command.progressNote,
        adjustments: command.adjustments,
        nextFollowUpDate: command.nextFollowUpDate,
        updatedByUserId: command.actorUserId,
        updatedAt: new Date(),
        version: sql`${nutricionFollowUps.version} + 1`,
      })
      .where(
        and(
          eq(nutricionFollowUps.id, command.id),
          eq(nutricionFollowUps.tenantId, command.tenantId),
          eq(nutricionFollowUps.version, command.version),
        ),
      )
      .returning({ id: nutricionFollowUps.id });

    return updated !== undefined;
  }

  private adultoSelection() {
    return {
      id: adultosMayores.id,
      tenantId: adultosMayores.tenantId,
      tenantName: tenants.name,
      documentNumber: adultosMayores.documentNumber,
      names: adultosMayores.names,
      surnames: adultosMayores.surnames,
      phone: adultosMayores.phone,
      birthDate: adultosMayores.birthDate,
      sex: adultosMayores.sex,
      eps: adultosMayores.eps,
      healthRegime: adultosMayores.healthRegime,
      status: adultosMayores.status,
      deathDate: adultosMayores.deathDate,
    };
  }

  private planQuery() {
    return this.database.db
      .select({
        ...this.adultoSelection(),
        planId: nutricionPlans.id,
        startDate: nutricionPlans.startDate,
        nextFollowUpDate: nutricionPlans.nextFollowUpDate,
        planStatus: nutricionPlans.status,
        assessment: nutricionPlans.assessment,
        goal: nutricionPlans.goal,
        recommendations: nutricionPlans.recommendations,
        restrictions: nutricionPlans.restrictions,
        createdByUserId: nutricionPlans.createdByUserId,
        updatedByUserId: nutricionPlans.updatedByUserId,
        version: nutricionPlans.version,
        createdAt: nutricionPlans.createdAt,
        updatedAt: nutricionPlans.updatedAt,
        professionalFullName: users.fullName,
        professionalRole: users.role,
      })
      .from(nutricionPlans)
      .innerJoin(adultosMayores, eq(adultosMayores.id, nutricionPlans.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, nutricionPlans.tenantId))
      .innerJoin(users, eq(users.id, nutricionPlans.createdByUserId))
      .$dynamic();
  }

  private followUpQuery() {
    return this.database.db
      .select({
        id: nutricionFollowUps.id,
        tenantId: nutricionFollowUps.tenantId,
        planId: nutricionFollowUps.planId,
        followUpDate: nutricionFollowUps.followUpDate,
        weightKg: nutricionFollowUps.weightKg,
        heightCm: nutricionFollowUps.heightCm,
        bodyMassIndex: nutricionFollowUps.bodyMassIndex,
        abdominalPerimeterCm: nutricionFollowUps.abdominalPerimeterCm,
        adherence: nutricionFollowUps.adherence,
        progressNote: nutricionFollowUps.progressNote,
        adjustments: nutricionFollowUps.adjustments,
        nextFollowUpDate: nutricionFollowUps.nextFollowUpDate,
        createdByUserId: nutricionFollowUps.createdByUserId,
        updatedByUserId: nutricionFollowUps.updatedByUserId,
        version: nutricionFollowUps.version,
        createdAt: nutricionFollowUps.createdAt,
        updatedAt: nutricionFollowUps.updatedAt,
        professionalFullName: users.fullName,
        professionalRole: users.role,
      })
      .from(nutricionFollowUps)
      .innerJoin(nutricionPlans, eq(nutricionPlans.id, nutricionFollowUps.planId))
      .innerJoin(users, eq(users.id, nutricionFollowUps.createdByUserId))
      .$dynamic();
  }

  private scopeCondition(tenantId: SQLWrapper, scope: NutricionScope) {
    return scope.type === "tenant" ? sql`${tenantId} = ${scope.tenantId}` : undefined;
  }

  private toAdulto(row: AdultoRow): NutricionAdultoRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.replace(/\s+/g, " ").trim(),
      phone: row.phone,
      birthDate: row.birthDate,
      sex: row.sex,
      eps: row.eps,
      healthRegime: row.healthRegime,
      status: row.status,
      deathDate: row.deathDate,
    };
  }

  private toPlan(row: PlanRow, meals: NutricionPlanRecord["meals"]): NutricionPlanRecord {
    return {
      id: row.planId,
      tenantId: row.tenantId,
      adultoMayorId: row.id,
      adultoMayor: this.toAdulto(row),
      startDate: row.startDate,
      nextFollowUpDate: row.nextFollowUpDate,
      status: row.planStatus,
      assessment: row.assessment,
      goal: row.goal,
      recommendations: row.recommendations,
      restrictions: row.restrictions,
      professional: {
        userId: row.createdByUserId,
        fullName: row.professionalFullName,
        role: row.professionalRole,
      },
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      meals,
    };
  }

  private toFollowUp(row: {
    id: string;
    tenantId: string;
    planId: string;
    followUpDate: string;
    weightKg: number | null;
    heightCm: number | null;
    bodyMassIndex: number | null;
    abdominalPerimeterCm: number | null;
    adherence: string;
    progressNote: string;
    adjustments: string | null;
    nextFollowUpDate: string | null;
    createdByUserId: string;
    updatedByUserId: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    professionalFullName: string;
    professionalRole: UserRole;
  }): NutricionFollowUpRecord {
    return {
      ...row,
      adherence: row.adherence as NutricionFollowUpAdherence,
      professional: {
        userId: row.createdByUserId,
        fullName: row.professionalFullName,
        role: row.professionalRole,
      },
    };
  }
}

export const nutricionRepositoryProvider = {
  provide: NUTRICION_REPOSITORY,
  useClass: DrizzleNutricionRepository,
};
