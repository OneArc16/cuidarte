import {
  type AtencionEnfermeriaDetail,
  type AtencionEnfermeriaHistoryResponse,
  type AtencionEnfermeriaListQuery,
  type AtencionEnfermeriaListResponse,
  type AtencionEnfermeriaLookupResponse,
  type AuthUser,
  atencionEnfermeriaAdultoResumenSchema,
  atencionEnfermeriaDetailSchema,
  atencionEnfermeriaHistoryResponseSchema,
  atencionEnfermeriaListResponseSchema,
  atencionEnfermeriaLookupResponseSchema,
  type CreateAtencionEnfermeriaRequest,
  type UpdateAtencionEnfermeriaRequest,
  createAtencionEnfermeriaRequestSchema,
  updateAtencionEnfermeriaRequestSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { calculateAgeFromBirthDate } from "../../adultos-mayores/application/age";
import {
  canCreateAtencionEnfermeria,
  canOpenAtencionEnfermeriaModule,
  canReadAtencionEnfermeriaModule,
  canEditAtencionEnfermeria,
  canManageAtencionEnfermeriaTrash,
  resolveAtencionEnfermeriaAccess,
  resolveAtencionEnfermeriaScope,
} from "../domain/atencion-enfermeria.policy";
import {
  type AtencionEnfermeriaAdultoRecord,
  type AtencionEnfermeriaDetailRecord,
  type AtencionEnfermeriaHistoryItemRecord,
  type AtencionEnfermeriaListItemRecord,
  type CreateAtencionEnfermeriaRecordCommand,
  type UpdateAtencionEnfermeriaRecordCommand,
} from "../domain/atencion-enfermeria.types";
import {
  AtencionEnfermeriaNotFoundError,
  AtencionEnfermeriaPermissionDeniedError,
  AtencionEnfermeriaVersionConflictError,
  ATENCIONES_ENFERMERIA_REPOSITORY,
  type AtencionesEnfermeriaRepository,
} from "../domain/atenciones-enfermeria.repository";

@Injectable()
export class AtencionesEnfermeriaService {
  constructor(
    @Inject(ATENCIONES_ENFERMERIA_REPOSITORY)
    private readonly atencionesRepository: AtencionesEnfermeriaRepository,
  ) {}

  async listAtenciones(
    query: AtencionEnfermeriaListQuery,
    actor: AuthUser,
  ): Promise<AtencionEnfermeriaListResponse> {
    this.ensureReadAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const records = await this.atencionesRepository.findMany({
      ...query,
      scope,
      tenantId: this.resolveQueryTenantId(query.tenantId, scope),
    });

    return atencionEnfermeriaListResponseSchema.parse({
      atencionesEnfermeria: records.map((record) => this.toListItem(record, actor)),
    });
  }

  async lookupAdultoMayor(
    adultoMayorId: string,
    actor: AuthUser,
  ): Promise<AtencionEnfermeriaLookupResponse> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    return atencionEnfermeriaLookupResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
    });
  }

  async getHistoriaClinica(
    adultoMayorId: string,
    actor: AuthUser,
  ): Promise<AtencionEnfermeriaHistoryResponse> {
    this.ensureReadAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const records = await this.atencionesRepository.findHistoryByAdultoMayor({
      adultoMayorId,
      scope,
    });

    return atencionEnfermeriaHistoryResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
      atenciones: records.map((record) => this.toListItem(record, actor)),
    });
  }

  async getAtencion(id: string, actor: AuthUser): Promise<AtencionEnfermeriaDetail> {
    this.ensureReadAccess(actor);
    const record = await this.getAccessibleAtencionOrThrow(id, actor);
    return this.toDetail(record, actor);
  }

  async getPapelera(adultoMayorId: string, actor: AuthUser): Promise<AtencionEnfermeriaHistoryResponse> {
    this.ensureTrashAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({ adultoMayorId, scope });
    if (adultoMayor === null) throw new NotFoundException("Adulto mayor no encontrado.");
    const records = await this.atencionesRepository.findTrashByAdultoMayor({ adultoMayorId, scope });
    return atencionEnfermeriaHistoryResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
      atenciones: records.map((record) => this.toListItem(record, actor)),
    });
  }

  async deleteAtencion(id: string, actor: AuthUser): Promise<{ success: true }> {
    this.ensureTrashAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.atencionesRepository.findById({ id, scope });
    if (record === null) throw new NotFoundException("Atencion de enfermeria no encontrada.");
    await this.runGuarded(() =>
      this.atencionesRepository.softDelete({ id, tenantId: record.tenantId, actorUserId: actor.id }),
    );
    return { success: true };
  }

  async restoreAtencion(id: string, actor: AuthUser): Promise<{ success: true }> {
    this.ensureTrashAccess(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.atencionesRepository.findById({ id, scope, includeDeleted: true });
    if (record === null || record.deletedAt === null) throw new NotFoundException("Atencion en papelera no encontrada.");
    await this.runGuarded(() =>
      this.atencionesRepository.restore({ id, tenantId: record.tenantId, actorUserId: actor.id }),
    );
    return { success: true };
  }

  async createAtencion(
    command: CreateAtencionEnfermeriaRequest,
    actor: AuthUser,
  ): Promise<AtencionEnfermeriaDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = createAtencionEnfermeriaRequestSchema.parse(command);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId: normalizedCommand.adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const created = await this.runGuarded(async () =>
      this.atencionesRepository.create({
        ...normalizedCommand,
        id: randomUUID(),
        tenantId: adultoMayor.tenantId,
        adultoMayorId: adultoMayor.id,
        actorUserId: actor.id,
      }),
    );

    return this.toDetail(created, actor);
  }

  async updateAtencion(
    id: string,
    command: UpdateAtencionEnfermeriaRequest,
    actor: AuthUser,
  ): Promise<AtencionEnfermeriaDetail> {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const normalizedCommand = updateAtencionEnfermeriaRequestSchema.parse(command);
    const currentRecord = await this.atencionesRepository.findById({ id, scope });

    if (currentRecord === null) {
      throw new NotFoundException("Atencion de enfermeria no encontrada.");
    }

    if (!canEditAtencionEnfermeria(actor, currentRecord)) {
      throw new ForbiddenException(
        "Solo puedes editar atenciones de enfermeria registradas por ti.",
      );
    }

    const updated = await this.runGuarded(async () =>
      this.atencionesRepository.update({
        ...normalizedCommand,
        id,
        tenantId: currentRecord.tenantId,
        actorUserId: actor.id,
      }),
    );

    return this.toDetail(updated, actor);
  }

  private ensureModuleAccess(actor: AuthUser) {
    if (!canOpenAtencionEnfermeriaModule(actor)) {
      throw new ForbiddenException("No tienes permisos para acceder a este modulo.");
    }
  }

  private ensureReadAccess(actor: AuthUser) {
    if (!canReadAtencionEnfermeriaModule(actor)) {
      throw new ForbiddenException("No tienes permisos para acceder a este modulo.");
    }
  }

  private ensureCanCreate(actor: AuthUser) {
    if (!canCreateAtencionEnfermeria(actor)) {
      throw new ForbiddenException("Solo una enfermera puede gestionar atenciones de enfermeria.");
    }
  }

  private ensureTrashAccess(actor: AuthUser) {
    if (!canManageAtencionEnfermeriaTrash(actor)) {
      throw new ForbiddenException("No tienes permisos para gestionar la papelera de enfermeria.");
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveAtencionEnfermeriaScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar atenciones.");
    }

    return scope;
  }

  private resolveQueryTenantId(
    tenantId: AtencionEnfermeriaListQuery["tenantId"],
    scope: ReturnType<typeof resolveAtencionEnfermeriaScope>,
  ) {
    return scope?.type === "all" ? tenantId : null;
  }

  private async getAccessibleAtencionOrThrow(id: string, actor: AuthUser) {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.atencionesRepository.findById({ id, scope });

    if (record === null) {
      throw new NotFoundException("Atencion de enfermeria no encontrada.");
    }

    const access = resolveAtencionEnfermeriaAccess(actor, record);

    if (access === null) {
      throw new ForbiddenException("No puedes consultar esta atencion de enfermeria.");
    }

    return record;
  }

  private async runGuarded<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AtencionEnfermeriaNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof AtencionEnfermeriaPermissionDeniedError) {
        throw new ForbiddenException(error.message);
      }

      if (error instanceof AtencionEnfermeriaVersionConflictError) {
        throw new ConflictException(error.message);
      }

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw error;
    }
  }

  private toListItem(
    record: AtencionEnfermeriaListItemRecord | AtencionEnfermeriaHistoryItemRecord,
    actor: AuthUser,
  ) {
    const access = resolveAtencionEnfermeriaAccess(actor, record);

    if (access === null) {
      throw new ForbiddenException("No puedes consultar esta atencion de enfermeria.");
    }

    return {
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      adultoMayor: this.toAdultoResumen(record.adultoMayor),
      attentionDate: record.attentionDate,
      attentionTime: record.attentionTime,
      careType: record.careType,
      reason: record.reason,
      glucometriaMgDl: record.glucometriaMgDl,
      glucometriaContext: record.glucometriaContext,
      access,
      professional: record.professional,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      deletedAt: record.deletedAt?.toISOString() ?? null,
      deletedByUserId: record.deletedByUserId ?? null,
    };
  }

  private toDetail(record: AtencionEnfermeriaDetailRecord, actor: AuthUser) {
    const access = resolveAtencionEnfermeriaAccess(actor, record);

    if (access === null) {
      throw new ForbiddenException("No puedes consultar esta atencion de enfermeria.");
    }

    return atencionEnfermeriaDetailSchema.parse({
      ...record,
      adultoMayor: this.toAdultoResumen(record.adultoMayor),
      access,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      deletedAt: record.deletedAt?.toISOString() ?? null,
      deletedByUserId: record.deletedByUserId ?? null,
    });
  }

  private toAdultoResumen(record: AtencionEnfermeriaAdultoRecord) {
    return atencionEnfermeriaAdultoResumenSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      documentNumber: record.documentNumber,
      fullName: record.fullName,
      age: calculateAgeFromBirthDate(record.birthDate),
      sex: record.sex,
      eps: record.eps,
      healthRegime: record.healthRegime,
    });
  }
}
