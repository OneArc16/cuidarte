import {
  type ActividadGrupalTipo,
  type ActividadGrupalTipoCreatorOption,
  type ActividadGrupalTiposListQuery,
  type AuthUser,
  type CreateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoStatusRequest,
  type UpdateActividadGrupalTipoConsecutiveConfigRequest,
  type UpdateActividadGrupalTipoGlobalConsecutiveConfigRequest,
  actividadGrupalTipoCreatorOptionSchema,
  actividadGrupalTipoSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { normalizeActividadGrupalTipoName } from "../domain/actividad-grupal-tipo-normalization";
import {
  canManageActividadGrupalTipos,
  canViewActividadGrupalTipos,
  resolveActividadGrupalTipoTenantId,
} from "../domain/actividad-grupal-tipo.policy";
import {
  ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY,
  type ActividadGrupalTiposRepository,
} from "../domain/actividad-grupal-tipos.repository";
import { type ActividadGrupalTipoRecord } from "../domain/actividad-grupal-tipo.types";

@Injectable()
export class ActividadGrupalTiposService {
  constructor(
    @Inject(ACTIVIDAD_GRUPAL_TIPOS_REPOSITORY)
    private readonly actividadGrupalTiposRepository: ActividadGrupalTiposRepository,
  ) {}

  async list(
    query: ActividadGrupalTiposListQuery,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo[]> {
    if (!canViewActividadGrupalTipos(actor)) {
      throw new ForbiddenException("No tienes permisos para consultar actividades grupales.");
    }

    const tenantId =
      actor.role === "super_admin" && query.tenantId === null
        ? null
        : this.resolveTenantIdForList(actor, query.tenantId);
    const records = await this.actividadGrupalTiposRepository.findMany({
      tenantId: actor.role === "super_admin" && query.tenantId === null ? null : tenantId,
      includeInactive: query.includeInactive,
    });

    return records.map((record) => this.toResponse(record));
  }

  async create(
    command: CreateActividadGrupalTipoRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo> {
    const tenantId = this.resolveTenantIdOrThrow(actor, command.tenantId);
    const normalizedName = normalizeActividadGrupalTipoName(command.name);

    if (normalizedName === "") {
      throw new BadRequestException("Ingresa un nombre para la actividad.");
    }

    await this.assertNameAvailable(tenantId, normalizedName);

    const record = await this.actividadGrupalTiposRepository.create({
      tenantId,
      actorUserId: actor.id,
      name: command.name.trim(),
      normalizedName,
    });

    return this.toResponse(record);
  }

  async update(
    id: string,
    command: UpdateActividadGrupalTipoRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo> {
    const current = await this.findAccessibleOrThrow(id, actor);
    const normalizedName = normalizeActividadGrupalTipoName(command.name);

    if (normalizedName === "") {
      throw new BadRequestException("Ingresa un nombre para la actividad.");
    }

    const duplicate = await this.actividadGrupalTiposRepository.findByTenantAndNormalizedName(
      current.tenantId,
      normalizedName,
    );

    if (duplicate !== null && duplicate.id !== id) {
      throw new ConflictException("Ya existe una actividad con ese nombre en este centro.");
    }

    const record = await this.actividadGrupalTiposRepository.update({
      id,
      actorUserId: actor.id,
      name: command.name.trim(),
      normalizedName,
    });

    return this.toResponse(record);
  }

  async updateStatus(
    id: string,
    command: UpdateActividadGrupalTipoStatusRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo> {
    const current = await this.findAccessibleOrThrow(id, actor);

    if (current.isActive === command.isActive) {
      return this.toResponse(current);
    }

    const record = await this.actividadGrupalTiposRepository.updateStatus({
      id,
      actorUserId: actor.id,
      isActive: command.isActive,
    });

    return this.toResponse(record);
  }

  async updateConsecutiveConfig(
    id: string,
    command: UpdateActividadGrupalTipoConsecutiveConfigRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo> {
    const current = await this.findAccessibleOrThrow(id, actor);
    const enabled = command.enabled;
    const prefix = enabled ? (command.prefix?.trim().toUpperCase() ?? "") : null;

    if (enabled && !/^[A-Z0-9]{2,24}$/.test(prefix ?? "")) {
      throw new BadRequestException("El prefijo solo puede incluir letras y números.");
    }

    const creatorUserIds = enabled ? [...new Set(command.creatorUserIds)] : [];
    const creatorOptions = enabled
      ? await this.actividadGrupalTiposRepository.findCreatorOptions(current.tenantId)
      : [];
    const allowedCreatorIds = new Set(creatorOptions.map((creator) => creator.id));

    if (
      enabled &&
      (creatorUserIds.length === 0 ||
        creatorUserIds.some((userId) => !allowedCreatorIds.has(userId)))
    ) {
      throw new BadRequestException("Selecciona personas activas del centro.");
    }

    const record = await this.actividadGrupalTiposRepository.updateConsecutiveConfig({
      id: current.id,
      actorUserId: actor.id,
      prefix,
      nextValue: enabled ? (command.nextValue ?? null) : null,
      creatorUserIds,
    });

    return this.toResponse(record);
  }

  async updateGlobalConsecutiveConfig(
    command: UpdateActividadGrupalTipoGlobalConsecutiveConfigRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipo[]> {
    if (actor.role !== "super_admin") {
      throw new ForbiddenException(
        "Solo un super administrador puede configurar una actividad en todos los centros.",
      );
    }

    const activityTypeIds = [...new Set(command.activityTypeIds)];
    const activityTypes = await Promise.all(
      activityTypeIds.map(async (id) => {
        const record = await this.actividadGrupalTiposRepository.findById(id);

        if (record === null) {
          throw new NotFoundException("La actividad configurada no fue encontrada.");
        }

        return record;
      }),
    );
    const normalizedNames = new Set(
      activityTypes.map((activityType) => activityType.normalizedName),
    );

    if (normalizedNames.size !== 1) {
      throw new BadRequestException("Selecciona la misma actividad en todos los centros.");
    }

    const prefix = command.enabled ? (command.prefix?.trim().toUpperCase() ?? "") : null;

    if (command.enabled && !/^[A-Z0-9]{2,24}$/.test(prefix ?? "")) {
      throw new BadRequestException("El prefijo solo puede incluir letras y números.");
    }

    const records = await Promise.all(
      activityTypes.map(async (activityType) => {
        const creatorUserIds = command.enabled
          ? activityType.consecutiveCreatorUserIds.length > 0
            ? activityType.consecutiveCreatorUserIds
            : (
                await this.actividadGrupalTiposRepository.findCreatorOptions(activityType.tenantId)
              ).map((creator) => creator.id)
          : [];

        if (command.enabled && creatorUserIds.length === 0) {
          throw new BadRequestException(
            "Cada centro debe tener al menos una persona activa para esta actividad.",
          );
        }

        return await this.actividadGrupalTiposRepository.updateConsecutiveConfig({
          id: activityType.id,
          actorUserId: actor.id,
          prefix,
          nextValue: command.enabled ? (activityType.consecutiveNextValue ?? 1) : null,
          creatorUserIds,
        });
      }),
    );

    return records.map((record) => this.toResponse(record));
  }

  async listCreatorOptions(
    id: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipoCreatorOption[]> {
    const current = await this.findAccessibleOrThrow(id, actor);
    const records = await this.actividadGrupalTiposRepository.findCreatorOptions(current.tenantId);

    return records.map((record) => actividadGrupalTipoCreatorOptionSchema.parse(record));
  }

  async listForSessionForm(
    tenantId: string,
    actor: Pick<AuthUser, "id">,
  ): Promise<ActividadGrupalTipo[]> {
    const records = await this.actividadGrupalTiposRepository.findMany({
      tenantId,
      includeInactive: false,
    });

    return records
      .filter(
        (record) =>
          record.consecutivePrefix === null ||
          record.consecutiveNextValue === null ||
          record.consecutiveCreatorUserIds.includes(actor.id),
      )
      .map((record) => this.toResponse(record));
  }

  async resolveForSessionCreate(
    activityTypeId: string,
    tenantId: string,
  ): Promise<ActividadGrupalTipo> {
    const record = await this.actividadGrupalTiposRepository.findById(activityTypeId);

    if (record === null || record.tenantId !== tenantId || !record.isActive) {
      throw new BadRequestException("Selecciona una actividad activa del centro.");
    }

    return this.toResponse(record);
  }

  async resolveForSessionUpdate(
    activityTypeId: string,
    tenantId: string,
    currentActivityTypeId: string,
  ): Promise<ActividadGrupalTipo> {
    const record = await this.actividadGrupalTiposRepository.findById(activityTypeId);

    if (record === null || record.tenantId !== tenantId) {
      throw new BadRequestException("Selecciona una actividad del centro.");
    }

    if (!record.isActive && record.id !== currentActivityTypeId) {
      throw new BadRequestException("No puedes cambiar la sesion a una actividad inactiva.");
    }

    return this.toResponse(record);
  }

  private async findAccessibleOrThrow(
    id: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalTipoRecord> {
    this.ensureCanManage(actor);

    const record = await this.actividadGrupalTiposRepository.findById(id);

    if (record === null) {
      throw new NotFoundException("La actividad configurada no fue encontrada.");
    }

    const tenantId = resolveActividadGrupalTipoTenantId(actor, record.tenantId);

    if (tenantId === null || tenantId !== record.tenantId) {
      throw new ForbiddenException("No puedes administrar actividades de otro centro.");
    }

    return record;
  }

  private resolveTenantIdOrThrow(actor: AuthUser, requestedTenantId: string | null): string {
    this.ensureCanManage(actor);

    const tenantId = resolveActividadGrupalTipoTenantId(actor, requestedTenantId);

    if (tenantId === null) {
      throw new BadRequestException("Selecciona el centro.");
    }

    if (
      actor.role !== "super_admin" &&
      requestedTenantId !== null &&
      requestedTenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes administrar actividades de otro centro.");
    }

    return tenantId;
  }

  private resolveTenantIdForList(actor: AuthUser, requestedTenantId: string | null): string {
    const tenantId = resolveActividadGrupalTipoTenantId(actor, requestedTenantId);

    if (tenantId === null) {
      throw new BadRequestException("El usuario no tiene un centro asociado.");
    }

    if (
      actor.role !== "super_admin" &&
      requestedTenantId !== null &&
      requestedTenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes consultar actividades de otro centro.");
    }

    return tenantId;
  }

  private ensureCanManage(actor: AuthUser): void {
    if (!canManageActividadGrupalTipos(actor)) {
      throw new ForbiddenException("No tienes permisos para administrar actividades.");
    }
  }

  private async assertNameAvailable(tenantId: string, normalizedName: string): Promise<void> {
    const existing = await this.actividadGrupalTiposRepository.findByTenantAndNormalizedName(
      tenantId,
      normalizedName,
    );

    if (existing !== null) {
      throw new ConflictException("Ya existe una actividad con ese nombre en este centro.");
    }
  }

  private toResponse(record: ActividadGrupalTipoRecord): ActividadGrupalTipo {
    return actividadGrupalTipoSchema.parse({
      ...record,
      consecutiveConfig:
        record.consecutivePrefix === null || record.consecutiveNextValue === null
          ? null
          : {
              prefix: record.consecutivePrefix,
              nextValue: record.consecutiveNextValue,
              creatorUserIds: record.consecutiveCreatorUserIds,
            },
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      deactivatedAt: record.deactivatedAt?.toISOString() ?? null,
    });
  }
}
