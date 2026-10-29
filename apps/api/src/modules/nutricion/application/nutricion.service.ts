import {
  type AuthUser,
  type CreateNutricionFollowUpRequest,
  type CreateNutricionPlanRequest,
  createNutricionFollowUpRequestSchema,
  createNutricionPlanRequestSchema,
  type NutricionAdultoListQuery,
  type NutricionAdultoListResponse,
  nutricionAdultoListResponseSchema,
  type NutricionAdultoProfileResponse,
  nutricionAdultoProfileResponseSchema,
  type NutricionFollowUp,
  type NutricionPlanDetail,
  type NutricionPlanListItem,
  nutricionPlanDetailSchema,
  type UpdateNutricionFollowUpRequest,
  type UpdateNutricionPlanRequest,
  updateNutricionFollowUpRequestSchema,
  updateNutricionPlanRequestSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { calculateAgeFromBirthDate } from "../../adultos-mayores/application/age";
import { assertAdultoMayorRecordDateAllowed } from "../../adultos-mayores/domain/adulto-mayor-status-policy";
import {
  canCreateNutricion,
  canEditNutricionRecord,
  canOpenNutricion,
  resolveNutricionScope,
} from "../domain/nutricion.policy";
import { NUTRICION_REPOSITORY, type NutricionRepository } from "../domain/nutricion.repository";
import {
  type NutricionAdultoRecord,
  type NutricionFollowUpMutableCommand,
  type NutricionFollowUpRecord,
  type NutricionPlanRecord,
} from "../domain/nutricion.types";

@Injectable()
export class NutricionService {
  constructor(
    @Inject(NUTRICION_REPOSITORY)
    private readonly nutricionRepository: NutricionRepository,
  ) {}

  async listAdultosMayores(
    query: NutricionAdultoListQuery,
    actor: AuthUser,
  ): Promise<NutricionAdultoListResponse> {
    const scope = this.ensureReadAccess(actor);
    const result = await this.nutricionRepository.findAdultosMayores({ ...query, scope });

    return nutricionAdultoListResponseSchema.parse({
      adultosMayores: result.adultosMayores.map((adultoMayor) => this.toAdultoResumen(adultoMayor)),
      total: result.total,
    });
  }

  async getAdultoProfile(
    adultoMayorId: string,
    actor: AuthUser,
  ): Promise<NutricionAdultoProfileResponse> {
    const scope = this.ensureReadAccess(actor);
    const adultoMayor = await this.nutricionRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const plans = await this.nutricionRepository.findPlansByAdultoMayor({ adultoMayorId, scope });
    return nutricionAdultoProfileResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
      plans: plans.map((plan) => this.toPlanListItem(plan, actor)),
    });
  }

  async getPlan(planId: string, actor: AuthUser): Promise<NutricionPlanDetail> {
    const scope = this.ensureReadAccess(actor);
    const plan = await this.nutricionRepository.findPlanById({ id: planId, scope });

    if (plan === null) {
      throw new NotFoundException("Plan nutricional no encontrado.");
    }

    const followUps = await this.nutricionRepository.findFollowUpsByPlanId({ planId, scope });
    return nutricionPlanDetailSchema.parse({
      ...this.toPlanListItem(plan, actor),
      adultoMayor: this.toAdultoResumen(plan.adultoMayor),
      assessment: plan.assessment,
      recommendations: plan.recommendations,
      restrictions: plan.restrictions,
      meals: plan.meals,
      followUps: followUps.map((followUp) => this.toFollowUp(followUp, actor)),
    });
  }

  async createPlan(
    command: CreateNutricionPlanRequest,
    actor: AuthUser,
  ): Promise<NutricionPlanDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = createNutricionPlanRequestSchema.parse(command);
    const adultoMayor = await this.nutricionRepository.findAdultoMayorById({
      adultoMayorId: normalizedCommand.adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    assertAdultoMayorRecordDateAllowed({
      status: adultoMayor.status,
      deathDate: adultoMayor.deathDate,
      recordDate: normalizedCommand.startDate,
    });

    const created = await this.nutricionRepository.createPlan({
      ...normalizedCommand,
      status: "active",
      tenantId: adultoMayor.tenantId,
      actorUserId: actor.id,
    });

    return this.getPlan(created.id, actor);
  }

  async updatePlan(
    planId: string,
    command: UpdateNutricionPlanRequest,
    actor: AuthUser,
  ): Promise<NutricionPlanDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = updateNutricionPlanRequestSchema.parse(command);
    const currentPlan = await this.nutricionRepository.findPlanById({ id: planId, scope });

    if (currentPlan === null) {
      throw new NotFoundException("Plan nutricional no encontrado.");
    }

    if (currentPlan.status === "archived") {
      throw new BadRequestException("Los planes archivados no se pueden modificar.");
    }

    if (currentPlan.status !== "active" && normalizedCommand.status === "active") {
      throw new BadRequestException("Un plan finalizado no se puede reactivar.");
    }

    if (!canEditNutricionRecord(actor, currentPlan)) {
      throw new ForbiddenException("No puedes modificar este plan nutricional.");
    }

    assertAdultoMayorRecordDateAllowed({
      status: currentPlan.adultoMayor.status,
      deathDate: currentPlan.adultoMayor.deathDate,
      recordDate: normalizedCommand.startDate,
    });

    const updated = await this.nutricionRepository.updatePlan({
      ...normalizedCommand,
      id: planId,
      tenantId: currentPlan.tenantId,
      actorUserId: actor.id,
    });

    if (!updated) {
      throw new ConflictException(
        "El plan cambió desde la última lectura. Recarga e inténtalo de nuevo.",
      );
    }

    return this.getPlan(planId, actor);
  }

  async createFollowUp(
    planId: string,
    command: CreateNutricionFollowUpRequest,
    actor: AuthUser,
  ): Promise<NutricionPlanDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = createNutricionFollowUpRequestSchema.parse(command);
    const plan = await this.nutricionRepository.findPlanById({ id: planId, scope });

    if (plan === null) {
      throw new NotFoundException("Plan nutricional no encontrado.");
    }

    if (plan.status !== "active") {
      throw new BadRequestException("Solo puedes registrar seguimientos en un plan activo.");
    }

    if (!canEditNutricionRecord(actor, plan)) {
      throw new ForbiddenException("No puedes registrar seguimientos en este plan nutricional.");
    }

    if (normalizedCommand.followUpDate < plan.startDate) {
      throw new BadRequestException("El seguimiento no puede ser anterior al inicio del plan.");
    }

    assertAdultoMayorRecordDateAllowed({
      status: plan.adultoMayor.status,
      deathDate: plan.adultoMayor.deathDate,
      recordDate: normalizedCommand.followUpDate,
    });

    await this.nutricionRepository.createFollowUp({
      ...this.toFollowUpCommand(normalizedCommand),
      planId,
      tenantId: plan.tenantId,
      actorUserId: actor.id,
    });

    return this.getPlan(planId, actor);
  }

  async updateFollowUp(
    followUpId: string,
    command: UpdateNutricionFollowUpRequest,
    actor: AuthUser,
  ): Promise<NutricionPlanDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = updateNutricionFollowUpRequestSchema.parse(command);
    const currentFollowUp = await this.nutricionRepository.findFollowUpById({
      id: followUpId,
      scope,
    });

    if (currentFollowUp === null) {
      throw new NotFoundException("Seguimiento nutricional no encontrado.");
    }

    if (!canEditNutricionRecord(actor, currentFollowUp)) {
      throw new ForbiddenException("No puedes modificar este seguimiento nutricional.");
    }

    const plan = await this.nutricionRepository.findPlanById({ id: currentFollowUp.planId, scope });
    if (plan === null) {
      throw new NotFoundException("Plan nutricional no encontrado.");
    }

    assertAdultoMayorRecordDateAllowed({
      status: plan.adultoMayor.status,
      deathDate: plan.adultoMayor.deathDate,
      recordDate: normalizedCommand.followUpDate,
    });

    const updated = await this.nutricionRepository.updateFollowUp({
      ...this.toFollowUpCommand(normalizedCommand),
      id: followUpId,
      tenantId: currentFollowUp.tenantId,
      actorUserId: actor.id,
      version: normalizedCommand.version,
    });

    if (!updated) {
      throw new ConflictException(
        "El seguimiento cambió desde la última lectura. Recarga e inténtalo de nuevo.",
      );
    }

    return this.getPlan(currentFollowUp.planId, actor);
  }

  private ensureReadAccess(actor: AuthUser) {
    if (!canOpenNutricion(actor)) {
      throw new ForbiddenException("No tienes permisos para acceder al módulo de nutrición.");
    }

    return this.resolveScopeOrThrow(actor);
  }

  private ensureCanCreate(actor: AuthUser) {
    if (!canCreateNutricion(actor)) {
      throw new ForbiddenException("No tienes permisos para registrar información nutricional.");
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveNutricionScope(actor);
    if (scope === null) {
      throw new ForbiddenException("No tienes una sede disponible para el módulo de nutrición.");
    }

    return scope;
  }

  private toAdultoResumen(record: NutricionAdultoRecord) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      documentType: record.documentType,
      documentNumber: record.documentNumber,
      fullName: record.fullName,
      phone: record.phone,
      age: calculateAgeFromBirthDate(record.birthDate),
      sex: record.sex,
      eps: record.eps,
      healthRegime: record.healthRegime,
    };
  }

  private toPlanListItem(
    record: Pick<
      NutricionPlanRecord,
      | "id"
      | "tenantId"
      | "adultoMayorId"
      | "startDate"
      | "nextFollowUpDate"
      | "status"
      | "goal"
      | "professional"
      | "createdByUserId"
      | "version"
      | "createdAt"
      | "updatedAt"
    >,
    actor: AuthUser,
  ): NutricionPlanListItem {
    return {
      id: record.id,
      tenantId: record.tenantId,
      adultoMayorId: record.adultoMayorId,
      startDate: record.startDate,
      nextFollowUpDate: record.nextFollowUpDate,
      status: record.status,
      goal: record.goal,
      professional: record.professional,
      access: canEditNutricionRecord(actor, record) ? "edit" : "view",
      version: record.version,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toFollowUp(record: NutricionFollowUpRecord, actor: AuthUser): NutricionFollowUp {
    return {
      id: record.id,
      planId: record.planId,
      followUpDate: record.followUpDate,
      weightKg: record.weightKg,
      heightCm: record.heightCm,
      bodyMassIndex: record.bodyMassIndex,
      abdominalPerimeterCm: record.abdominalPerimeterCm,
      adherence: record.adherence,
      progressNote: record.progressNote,
      adjustments: record.adjustments,
      nextFollowUpDate: record.nextFollowUpDate,
      professional: record.professional,
      access: canEditNutricionRecord(actor, record) ? "edit" : "view",
      version: record.version,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private toFollowUpCommand(
    command: CreateNutricionFollowUpRequest | UpdateNutricionFollowUpRequest,
  ): NutricionFollowUpMutableCommand {
    const { version: _version, ...followUp } = command as UpdateNutricionFollowUpRequest;
    const bodyMassIndex =
      followUp.weightKg === null || followUp.heightCm === null
        ? null
        : Math.round((followUp.weightKg / (followUp.heightCm / 100) ** 2) * 100) / 100;

    return { ...followUp, bodyMassIndex };
  }
}
