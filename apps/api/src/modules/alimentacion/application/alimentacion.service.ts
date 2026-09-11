import {
  type AlimentacionAdultoOption,
  type AlimentacionAdultoOptionsQuery,
  type AlimentacionDetail,
  type AlimentacionFormatoEntregaExportQuery,
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
  canAccessAlimentacion,
  canDeleteAlimentacion,
  canManageAlimentacion,
  resolveAlimentacionScope,
  resolveAlimentacionTenantForCreate,
} from "../domain/alimentacion.policy";
import {
  ALIMENTACION_REPOSITORY,
  type AlimentacionRepository,
} from "../domain/alimentacion.repository";
import {
  type AlimentacionFormatoEmissionRecord,
  type AlimentacionRecord,
  type AlimentacionScope,
  type CreateAlimentacionFormatoEmissionCommand,
} from "../domain/alimentacion.types";
import { type AlimentacionFormatoEntregaExportData } from "./alimentacion-formato-export.types";

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
    this.ensureCanAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const effectiveTenantId = this.resolveListTenantId(scope, query.tenantId);
    const records = await this.alimentacionRepository.findMany({
      search: query.search,
      deliveryMonth: query.deliveryMonth,
      tenantId: effectiveTenantId,
      scope,
    });

    return records.map((record) => this.toListItem(record, actor));
  }

  async listTenantOptions(actor: AuthUser): Promise<AlimentacionTenantOption[]> {
    this.ensureCanAccess(actor);

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
    this.ensureCanManage(actor);
    const tenantId = this.resolveTenantIdForSelection(actor, query.tenantId);
    const records = await this.alimentacionRepository.searchAdultosMayoresOptions({
      tenantId,
      deliveryDate: query.deliveryDate,
      search: query.search,
      limit: query.limit,
    });

    return records.map((record) => alimentacionAdultoOptionSchema.parse(record));
  }

  async lookupAdultoMayorByDate(
    adultoMayorId: string,
    query: AlimentacionLookupByAdultoMayorQuery,
    actor: AuthUser,
  ) {
    this.ensureCanManage(actor);
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
    this.ensureCanManage(actor);
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
    this.ensureCanAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.alimentacionRepository.findById({ id, scope });

    if (record === null) {
      throw new NotFoundException("Registro de alimentacion no encontrado.");
    }

    return this.toDetail(record, actor);
  }

  async updateRegistro(
    id: string,
    command: UpdateAlimentacionRequest,
    actor: AuthUser,
  ): Promise<AlimentacionDetail> {
    this.ensureCanManage(actor);
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

      return this.toDetail(updatedRecord, actor);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async deleteRegistro(id: string, actor: AuthUser): Promise<void> {
    this.ensureCanDelete(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const deletedRecord = await this.alimentacionRepository.delete({
      id,
      actorUserId: actor.id,
      scope,
    });

    if (deletedRecord === null) {
      throw new NotFoundException("Registro de alimentacion no encontrado.");
    }
  }

  async prepareFormatoEntregaExport(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<AlimentacionFormatoEntregaExportData> {
    this.ensureCanAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.alimentacionRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const records = await this.alimentacionRepository.findFormatoEntregaByAdultoAndMonth({
      adultoMayorId,
      deliveryMonth: query.deliveryMonth,
      scope,
    });

    const firstRecord = records[0];

    return {
      tenantId: adultoMayor.tenantId,
      tenantName: adultoMayor.tenantName,
      tenantCity: firstRecord?.tenantCity ?? adultoMayor.tenantCity,
      tenantDepartment: firstRecord?.tenantDepartment ?? adultoMayor.tenantDepartment,
      adultoMayorId: adultoMayor.id,
      documentNumber: adultoMayor.documentNumber,
      fullName: adultoMayor.fullName,
      deliveryMonth: query.deliveryMonth,
      records: records.map((record) => ({
        deliveryDate: record.deliveryDate,
        organizer: record.organizer,
        refrigerio1: record.refrigerio1,
        almuerzo: record.almuerzo,
        refrigerio2: record.refrigerio2,
        auxilioTransporte: record.auxilioTransporte,
        updatedAt: record.updatedAt,
      })),
    };
  }

  async findLatestFormatoEntregaEmission(
    adultoMayorId: string,
    query: AlimentacionFormatoEntregaExportQuery,
    actor: AuthUser,
  ): Promise<AlimentacionFormatoEmissionRecord | null> {
    this.ensureCanAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);

    return await this.alimentacionRepository.findLatestFormatoEntregaEmission({
      adultoMayorId,
      deliveryMonth: query.deliveryMonth,
      scope,
    });
  }

  async createFormatoEntregaEmission(
    command: CreateAlimentacionFormatoEmissionCommand,
  ): Promise<AlimentacionFormatoEmissionRecord> {
    return await this.alimentacionRepository.createFormatoEntregaEmission(command);
  }

  async registerFormatoEntregaExportAudit(
    payload: Pick<
      AlimentacionFormatoEntregaExportData,
      "tenantId" | "adultoMayorId" | "deliveryMonth"
    >,
    actor: AuthUser,
  ): Promise<void> {
    this.ensureCanAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);

    if (scope.type === "tenant" && payload.tenantId !== scope.tenantId) {
      throw new ForbiddenException(
        "No puedes registrar auditoria de exportacion para un centro diferente al tuyo.",
      );
    }

    await this.alimentacionRepository.createFormatoEntregaExportAudit({
      actorUserId: actor.id,
      targetTenantId: payload.tenantId,
      adultoMayorId: payload.adultoMayorId,
      deliveryMonth: payload.deliveryMonth,
    });
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveAlimentacionScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar alimentacion.");
    }

    return scope;
  }

  private ensureCanAccess(actor: Pick<AuthUser, "role">) {
    if (!canAccessAlimentacion(actor)) {
      throw new ForbiddenException("No tienes permisos para consultar alimentacion.");
    }
  }

  private ensureCanManage(actor: Pick<AuthUser, "role">) {
    if (!canManageAlimentacion(actor)) {
      throw new ForbiddenException(
        "No tienes permisos para crear o editar registros de alimentacion.",
      );
    }
  }

  private ensureCanDelete(actor: Pick<AuthUser, "role">) {
    if (!canDeleteAlimentacion(actor)) {
      throw new ForbiddenException("No tienes permisos para eliminar registros de alimentacion.");
    }
  }

  private resolveListTenantId(scope: AlimentacionScope, requestedTenantId: string | null) {
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

  private toListItem(
    record: AlimentacionRecord,
    actor: Pick<AuthUser, "role">,
  ): AlimentacionListItem {
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
      canDelete: canDeleteAlimentacion(actor),
      importedFormato:
        record.importedFormato === null
          ? null
          : {
              id: record.importedFormato.id,
              version: record.importedFormato.version,
              originalName: record.importedFormato.originalName,
              mimeType: record.importedFormato.mimeType,
              sizeBytes: record.importedFormato.sizeBytes,
              importedByUserId: record.importedFormato.importedByUserId,
              importedByUserFullName: record.importedFormato.importedByUserFullName,
              importedAt: record.importedFormato.importedAt.toISOString(),
            },
    });
  }

  private toDetail(record: AlimentacionRecord, actor: Pick<AuthUser, "role">): AlimentacionDetail {
    return alimentacionDetailSchema.parse(this.toListItem(record, actor));
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
