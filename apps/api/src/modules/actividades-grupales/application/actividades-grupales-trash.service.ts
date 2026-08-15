import {
  type ActividadGrupalListQuery,
  actividadGrupalListItemSchema,
  actividadGrupalTrashListItemSchema,
  type AuthUser,
} from "@cuidarte/contracts";
import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  canListTrashActividadesGrupales,
  canManageActividadesGrupales,
  canRestoreActividadGrupal,
  canTrashActividadGrupal,
  resolveActividadesGrupalesScope,
} from "../domain/actividad-grupal.policy";
import {
  ACTIVIDADES_GRUPALES_REPOSITORY,
  type ActividadesGrupalesRepository,
} from "../domain/actividades-grupales.repository";
import { type ActividadGrupalTrashRecord } from "../domain/actividad-grupal.types";

@Injectable()
export class ActividadesGrupalesTrashService {
  constructor(
    @Inject(ACTIVIDADES_GRUPALES_REPOSITORY)
    private readonly actividadesGrupalesRepository: ActividadesGrupalesRepository,
  ) {}

  async sendToTrash(activityId: string, actor: AuthUser): Promise<void> {
    this.ensureCanManageActivities(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const detail = await this.actividadesGrupalesRepository.findById({ activityId, scope });

    if (detail === null) {
      throw new NotFoundException("La actividad grupal no fue encontrada.");
    }

    if (!canTrashActividadGrupal(detail.activity, actor)) {
      throw new ForbiddenException("No tienes permisos para eliminar esta actividad.");
    }

    await this.actividadesGrupalesRepository.delete({
      activityId,
      actorUserId: actor.id,
    });
  }

  async listTrash(query: ActividadGrupalListQuery, actor: AuthUser) {
    this.ensureCanListTrash(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const effectiveTenantId = this.resolveListTenantId(scope, query.tenantId);
    const records = await this.actividadesGrupalesRepository.findTrashMany({
      search: query.search,
      activityType: query.activityType,
      tenantId: effectiveTenantId,
      scope,
    });

    return records.map((record) => this.toTrashListItem(record, actor));
  }

  async restore(activityId: string, actor: AuthUser): Promise<void> {
    const scope = this.resolveScopeOrThrow(actor);
    const detail = await this.actividadesGrupalesRepository.findTrashById({ activityId, scope });

    if (detail === null) {
      throw new NotFoundException("La acta eliminada no fue encontrada.");
    }

    if (!canRestoreActividadGrupal(detail, actor)) {
      throw new ForbiddenException("No tienes permisos para restaurar esta acta.");
    }

    const restored = await this.actividadesGrupalesRepository.restore({
      activityId,
      actorUserId: actor.id,
    });

    if (!restored) {
      throw new ConflictException("El acta ya fue restaurada o cambió de estado.");
    }
  }

  private ensureCanManageActivities(actor: Pick<AuthUser, "role">) {
    if (!canManageActividadesGrupales(actor)) {
      throw new ForbiddenException("No tienes permisos para crear o diligenciar actividades.");
    }
  }

  private ensureCanListTrash(actor: Pick<AuthUser, "role" | "tenantId">) {
    if (!canListTrashActividadesGrupales(actor)) {
      throw new ForbiddenException("No tienes permisos para consultar la papelera.");
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveActividadesGrupalesScope(actor);

    if (scope === null) {
      throw new ForbiddenException(
        "No tienes un centro asociado para gestionar actividades grupales.",
      );
    }

    return scope;
  }

  private resolveListTenantId(
    scope: ReturnType<typeof this.resolveScopeOrThrow>,
    requestedTenantId: string | null,
  ) {
    if (scope.type === "all") {
      return requestedTenantId;
    }

    if (requestedTenantId !== null && requestedTenantId !== scope.tenantId) {
      throw new ForbiddenException("No puedes consultar actividades de otro centro.");
    }

    return scope.tenantId;
  }

  private toTrashListItem(record: ActividadGrupalTrashRecord, actor: AuthUser) {
    return actividadGrupalTrashListItemSchema.parse({
      ...actividadGrupalListItemSchema.parse({
        id: record.id,
        tenantId: record.tenantId,
        tenantName: record.tenantName,
        actaNumber: record.actaNumber,
        activityName: record.activityName,
        activityType: record.activityType,
        activityDate: record.activityDate,
        startTime: record.startTime,
        endTime: record.endTime,
        organizer: record.organizer,
        involvedEmployeesCount: record.involvedEmployeesCount,
        canEdit: false,
        canDelete: false,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      }),
      deletedAt: record.deletedAt.toISOString(),
      deletedByUserId: record.deletedByUserId,
      deletedByUserFullName: record.deletedByUserFullName,
      canRestore: canRestoreActividadGrupal(record, actor),
    });
  }
}
