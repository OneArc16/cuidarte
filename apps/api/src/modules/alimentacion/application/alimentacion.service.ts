import {
  type AlimentacionAdultoOption,
  type AlimentacionAdultoOptionsQuery,
  type AlimentacionDetail,
  type AlimentacionListItem,
  type AlimentacionListQuery,
  type AlimentacionLookupByAdultoMayorQuery,
  type AlimentacionTenantOption,
  type AuthUser,
  type CreateAlimentacionBatchRequest,
  type UpdateAlimentacionRequest,
  alimentacionAdultoOptionSchema,
  alimentacionDetailSchema,
  alimentacionListItemSchema,
  alimentacionLookupByAdultoMayorResponseSchema,
  alimentacionTenantOptionSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  resolveAlimentacionScope,
  resolveAlimentacionTenantForCreate,
} from "../domain/alimentacion.policy";
import {
  ALIMENTACION_REPOSITORY,
  type AlimentacionRepository,
} from "../domain/alimentacion.repository";
import { type AlimentacionRecord, type AlimentacionScope } from "../domain/alimentacion.types";

@Injectable()
export class AlimentacionService {
  constructor(
    @Inject(ALIMENTACION_REPOSITORY)
    private readonly alimentacionRepository: AlimentacionRepository,
  ) {}

  async listRegistros(
    query: AlimentacionListQuery,
    actor: AuthUser,
  ): Promise<AlimentacionListItem[]> {
    const scope = this.resolveScopeOrThrow(actor);
    const effectiveTenantId = this.resolveListTenantId(scope, query.tenantId);
    const records = await this.alimentacionRepository.findMany({
      search: query.search,
      deliveryDate: query.deliveryDate,
      tenantId: effectiveTenantId,
      scope,
    });

    return records.map((record) => this.toListItem(record));
  }

  async listTenantOptions(actor: AuthUser): Promise<AlimentacionTenantOption[]> {
    if (actor.role !== "super_admin") {
      return [];
    }

    const tenants = await this.alimentacionRepository.findTenantOptions();

    return tenants.map((tenant) => alimentacionTenantOptionSchema.parse(tenant));
  }

  async searchAdultosMayoresOptions(
    query: AlimentacionAdultoOptionsQuery,
    actor: AuthUser,
  ): Promise<AlimentacionAdultoOption[]> {
    const tenantId = this.resolveTenantIdForSelection(actor, query.tenantId);
    const records = await this.alimentacionRepository.searchAdultosMayoresOptions({
      tenantId,
      deliveryDate: query.deliveryDate,
      search: query.search,
    });

    return records.map((record) => alimentacionAdultoOptionSchema.parse(record));
  }

  async lookupAdultoMayorByDate(
    adultoMayorId: string,
    query: AlimentacionLookupByAdultoMayorQuery,
    actor: AuthUser,
  ) {
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.alimentacionRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const existingRecord = await this.alimentacionRepository.findByAdultoMayorAndDate({
      tenantId: adultoMayor.tenantId,
      adultoMayorId,
      deliveryDate: query.deliveryDate,
    });

    return alimentacionLookupByAdultoMayorResponseSchema.parse({
      adultoMayor,
      existingRecordId: existingRecord?.id ?? null,
    });
  }

  async createBatch(
    command: CreateAlimentacionBatchRequest,
    actor: AuthUser,
  ): Promise<{ createdCount: number }> {
    const tenantId = this.resolveTenantIdForCreate(actor, command.tenantId);
    const adultoMayorIds = command.registros.map((registro) => registro.adultoMayorId);
    const adultosMayores = await this.alimentacionRepository.findAdultosMayoresByIds(
      tenantId,
      adultoMayorIds,
    );

    if (adultosMayores.length !== new Set(adultoMayorIds).size) {
      throw new BadRequestException(
        "Selecciona adultos mayores validos del centro para registrar la alimentacion.",
      );
    }

    const existingRecords = await this.alimentacionRepository.findExistingByAdultosAndDate({
      tenantId,
      deliveryDate: command.deliveryDate,
      adultoMayorIds,
    });

    if (existingRecords.length > 0) {
      throw new ConflictException(
        "Ya existen registros de alimentacion para algunos adultos mayores en la fecha seleccionada.",
      );
    }

    try {
      const createdCount = await this.alimentacionRepository.createMany({
        tenantId,
        actorUserId: actor.id,
        deliveryDate: command.deliveryDate,
        organizer: command.organizer,
        registros: command.registros,
      });

      return { createdCount };
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async getRegistro(id: string, actor: AuthUser): Promise<AlimentacionDetail> {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.alimentacionRepository.findById({ id, scope });

    if (record === null) {
      throw new NotFoundException("Registro de alimentacion no encontrado.");
    }

    return this.toDetail(record);
  }

  async updateRegistro(
    id: string,
    command: UpdateAlimentacionRequest,
    actor: AuthUser,
  ): Promise<AlimentacionDetail> {
    const scope = this.resolveScopeOrThrow(actor);
    const currentRecord = await this.alimentacionRepository.findById({ id, scope });

    if (currentRecord === null) {
      throw new NotFoundException("Registro de alimentacion no encontrado.");
    }

    const conflictingRecord = await this.alimentacionRepository.findByAdultoMayorAndDate({
      tenantId: currentRecord.tenantId,
      adultoMayorId: currentRecord.adultoMayorId,
      deliveryDate: command.deliveryDate,
      excludeId: id,
    });

    if (conflictingRecord !== null) {
      throw new ConflictException(
        "Ya existe un registro de alimentacion para este adulto mayor en la fecha seleccionada.",
      );
    }

    try {
      const updatedRecord = await this.alimentacionRepository.update({
        id,
        actorUserId: actor.id,
        deliveryDate: command.deliveryDate,
        organizer: command.organizer,
        refrigerio1: command.refrigerio1,
        almuerzo: command.almuerzo,
        refrigerio2: command.refrigerio2,
        auxilioTransporte: command.auxilioTransporte,
      });

      return this.toDetail(updatedRecord);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveAlimentacionScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar alimentacion.");
    }

    return scope;
  }

  private resolveListTenantId(
    scope: AlimentacionScope,
    requestedTenantId: string | null,
  ) {
    if (scope.type === "all") {
      return requestedTenantId;
    }

    if (requestedTenantId !== null && requestedTenantId !== scope.tenantId) {
      throw new ForbiddenException("No puedes consultar registros de alimentacion de otro centro.");
    }

    return scope.tenantId;
  }

  private resolveTenantIdForSelection(actor: AuthUser, requestedTenantId: string | null): string {
    if (actor.role === "super_admin") {
      if (requestedTenantId === null) {
        throw new BadRequestException(
          "Selecciona el centro para buscar adultos mayores de alimentacion.",
        );
      }

      return requestedTenantId;
    }

    if (actor.tenantId === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar alimentacion.");
    }

    if (requestedTenantId !== null && requestedTenantId !== actor.tenantId) {
      throw new ForbiddenException(
        "No puedes buscar adultos mayores de alimentacion en otro centro.",
      );
    }

    return actor.tenantId;
  }

  private resolveTenantIdForCreate(actor: AuthUser, requestedTenantId: string | null): string {
    const tenantId = resolveAlimentacionTenantForCreate(actor, requestedTenantId);

    if (tenantId === null) {
      throw new BadRequestException(
        "Selecciona el centro en el que se registrara la alimentacion.",
      );
    }

    if (
      actor.role !== "super_admin" &&
      requestedTenantId !== null &&
      requestedTenantId !== tenantId
    ) {
      throw new ForbiddenException(
        "No puedes registrar alimentacion en un centro diferente al tuyo.",
      );
    }

    return tenantId;
  }

  private toListItem(record: AlimentacionRecord): AlimentacionListItem {
    return alimentacionListItemSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      adultoMayorId: record.adultoMayorId,
      documentNumber: record.documentNumber,
      fullName: record.fullName,
      deliveryDate: record.deliveryDate,
      organizer: record.organizer,
      refrigerio1: record.refrigerio1,
      almuerzo: record.almuerzo,
      refrigerio2: record.refrigerio2,
      auxilioTransporte: record.auxilioTransporte,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDetail(record: AlimentacionRecord): AlimentacionDetail {
    return alimentacionDetailSchema.parse(this.toListItem(record));
  }

  private throwConflictForUniqueViolation(error: unknown): never | void {
    if (!isPostgresUniqueViolation(error)) {
      return;
    }

    const constraintName = error.constraint_name ?? error.constraint ?? "";

    if (constraintName === "alimentacion_registros_tenant_adulto_fecha_unique") {
      throw new ConflictException(
        "Ya existe un registro de alimentacion para este adulto mayor en la fecha seleccionada.",
      );
    }

    throw new ConflictException("La operacion entra en conflicto con datos existentes.");
  }
}

function isPostgresUniqueViolation(error: unknown): error is {
  code: string;
  constraint?: string;
  constraint_name?: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}
