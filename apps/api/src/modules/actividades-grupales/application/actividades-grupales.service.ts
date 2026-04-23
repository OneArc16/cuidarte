import {
  type ActividadGrupalEmpleadoOption,
  type ActividadGrupalListItem,
  type ActividadGrupalListQuery,
  type ActividadGrupalTenantOption,
  type AuthUser,
  type CreateActividadGrupalRequest,
  actividadGrupalEmpleadoOptionSchema,
  actividadGrupalListItemSchema,
  actividadGrupalTenantOptionSchema,
} from "@cuidarte/contracts";
import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import {
  resolveActividadGrupalTenantForCreate,
  resolveActividadesGrupalesScope,
} from "../domain/actividad-grupal.policy";
import {
  type ActividadGrupalRecord,
  type ActividadesGrupalesScope,
} from "../domain/actividad-grupal.types";
import {
  ACTIVIDADES_GRUPALES_REPOSITORY,
  type ActividadesGrupalesRepository,
} from "../domain/actividades-grupales.repository";

@Injectable()
export class ActividadesGrupalesService {
  constructor(
    @Inject(ACTIVIDADES_GRUPALES_REPOSITORY)
    private readonly actividadesGrupalesRepository: ActividadesGrupalesRepository,
  ) {}

  async listActividadesGrupales(
    query: ActividadGrupalListQuery,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem[]> {
    const scope = this.resolveScopeOrThrow(actor);
    const effectiveTenantId = this.resolveListTenantId(scope, query.tenantId);
    const records = await this.actividadesGrupalesRepository.findMany({
      search: query.search,
      activityType: query.activityType,
      tenantId: effectiveTenantId,
      scope,
    });

    return records.map((record) => this.toListItem(record));
  }

  async listTenantOptions(actor: AuthUser): Promise<ActividadGrupalTenantOption[]> {
    if (actor.role !== "super_admin") {
      return [];
    }

    const tenants = await this.actividadesGrupalesRepository.findTenantOptions();

    return tenants.map((tenant) => actividadGrupalTenantOptionSchema.parse(tenant));
  }

  async getFormOptions(
    query: { tenantId: string | null },
    actor: AuthUser,
  ): Promise<{ nextActaNumber: number; empleados: ActividadGrupalEmpleadoOption[] }> {
    const tenantId = this.resolveTenantIdForForm(actor, query.tenantId);
    const [nextActaNumber, empleados] = await Promise.all([
      this.actividadesGrupalesRepository.getNextActaNumber(tenantId),
      this.actividadesGrupalesRepository.findActiveEmpleadoOptions(tenantId),
    ]);

    return {
      nextActaNumber,
      empleados: empleados.map((empleado) => actividadGrupalEmpleadoOptionSchema.parse(empleado)),
    };
  }

  async createActividadGrupal(
    command: CreateActividadGrupalRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem> {
    this.resolveScopeOrThrow(actor);

    const tenantId = this.resolveTenantIdForCreate(actor, command.tenantId);
    const activeEmpleados =
      await this.actividadesGrupalesRepository.findActiveEmpleadoOptions(tenantId);
    const activeEmpleadoIds = new Set(activeEmpleados.map((empleado) => empleado.id));
    const hasInvalidEmpleado = command.employeeIds.some(
      (employeeId) => !activeEmpleadoIds.has(employeeId),
    );

    if (hasInvalidEmpleado) {
      throw new BadRequestException(
        "Selecciona empleados activos del centro para registrar la actividad.",
      );
    }

    const record = await this.actividadesGrupalesRepository.create({
      tenantId,
      actorUserId: actor.id,
      activityName: command.activityName,
      activityType: command.activityType,
      activityDate: command.activityDate,
      startTime: command.startTime,
      endTime: command.endTime,
      organizer: command.organizer,
      employeeIds: command.employeeIds,
    });

    return this.toListItem(record);
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

  private resolveListTenantId(scope: ActividadesGrupalesScope, requestedTenantId: string | null) {
    if (scope.type === "all") {
      return requestedTenantId;
    }

    if (requestedTenantId !== null && requestedTenantId !== scope.tenantId) {
      throw new ForbiddenException("No puedes consultar actividades de otro centro.");
    }

    return scope.tenantId;
  }

  private resolveTenantIdForForm(actor: AuthUser, requestedTenantId: string | null): string {
    const tenantId = resolveActividadGrupalTenantForCreate(actor, requestedTenantId);

    if (actor.role === "super_admin" && requestedTenantId === null) {
      throw new BadRequestException("Selecciona un centro para cargar el formulario.");
    }

    if (tenantId === null) {
      throw new BadRequestException("Selecciona un centro para cargar el formulario.");
    }

    if (
      actor.role !== "super_admin" &&
      requestedTenantId !== null &&
      requestedTenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes cargar empleados de otro centro.");
    }

    return tenantId;
  }

  private resolveTenantIdForCreate(actor: AuthUser, requestedTenantId: string | null): string {
    const tenantId = resolveActividadGrupalTenantForCreate(actor, requestedTenantId);

    if (tenantId === null) {
      throw new BadRequestException("Selecciona el centro en el que se registrara la actividad.");
    }

    if (
      actor.role !== "super_admin" &&
      requestedTenantId !== null &&
      requestedTenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes crear actividades en otro centro.");
    }

    return tenantId;
  }

  private toListItem(record: ActividadGrupalRecord): ActividadGrupalListItem {
    return actividadGrupalListItemSchema.parse({
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
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }
}
