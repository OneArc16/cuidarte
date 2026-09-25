import {
  type AdultoMayorDetail,
  type AdultoMayorListItem,
  type AdultoMayorListQuery,
  type AdultoMayorTenantOption,
  type AdultoMayorTrashListItem,
  type AdultoMayorStatusHistoryQuery,
  type SendAdultoMayorToTrashRequest,
  type AuthUser,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorDetailSchema,
  adultoMayorListItemSchema,
  adultoMayorTenantOptionSchema,
  adultoMayorTrashListItemSchema,
  adultoMayorStatusHistoryResponseSchema,
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

import { calculateAgeFromBirthDate } from "./age";
import {
  canManageAdultosMayores,
  canManageAdultosMayoresTrash,
  resolveAdultoMayorTenantForCreate,
  resolveAdultosMayoresScope,
  resolveAdultosMayoresTrashScope,
} from "../domain/adulto-mayor.policy";
import {
  ADULTOS_MAYORES_REPOSITORY,
  type AdultosMayoresRepository,
} from "../domain/adultos-mayores.repository";
import { type AdultoMayorRecord } from "../domain/adulto-mayor.types";
import {
  assertAdultoMayorStatusData,
  canCorrectDeceasedStatus,
} from "../domain/adulto-mayor-status-policy";
import { UbicacionesService } from "../../ubicaciones/application/ubicaciones.service";
import { EpsService } from "../../eps/application/eps.service";
import {
  ADULTOS_MAYORES_FILES_STORAGE,
  type AdultoMayorPdfUpload,
  type AdultosMayoresFilesStorage,
} from "../domain/adultos-mayores-files.storage";
import { type AdultoMayorDocumentRecord } from "../domain/adulto-mayor.types";

const MAX_ADULTO_MAYOR_PDF_SIZE_BYTES = 10 * 1024 * 1024;

@Injectable()
export class AdultosMayoresService {
  constructor(
    @Inject(ADULTOS_MAYORES_REPOSITORY)
    private readonly adultosMayoresRepository: AdultosMayoresRepository,
    private readonly ubicacionesService: UbicacionesService,
    private readonly epsService: EpsService,
    @Inject(ADULTOS_MAYORES_FILES_STORAGE)
    private readonly filesStorage: AdultosMayoresFilesStorage,
  ) {}

  async listAdultosMayores(
    query: AdultoMayorListQuery,
    actor: AuthUser,
  ): Promise<AdultoMayorListItem[]> {
    const scope = resolveAdultosMayoresScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para consultar adultos mayores.");
    }

    const records = await this.adultosMayoresRepository.findMany({
      search: query.search,
      scope,
    });

    return records.map((record) => this.toListItem(record));
  }

  async listTenantOptions(actor: AuthUser): Promise<AdultoMayorTenantOption[]> {
    if (actor.role !== "super_admin") {
      return [];
    }

    const tenants = await this.adultosMayoresRepository.findTenantOptions();

    return tenants.map((tenant) => adultoMayorTenantOptionSchema.parse(tenant));
  }

  async listTrashAdultosMayores(
    query: AdultoMayorListQuery,
    actor: AuthUser,
  ): Promise<AdultoMayorTrashListItem[]> {
    this.ensureCanManageTrash(actor);
    const scope = this.resolveTrashScopeOrThrow(actor);
    const records = await this.adultosMayoresRepository.findTrashMany({
      search: query.search,
      scope,
    });

    return records.map((record) =>
      adultoMayorTrashListItemSchema.parse({
        id: record.id,
        tenantId: record.tenantId,
        tenantName: record.tenantName,
        documentType: record.documentType,
        documentNumber: record.documentNumber,
        names: record.names,
        surnames: record.surnames,
        phone: record.phone,
        birthDate: record.birthDate,
        age: calculateAgeFromBirthDate(record.birthDate),
        sex: record.sex,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        deletedAt: record.deletedAt.toISOString(),
        deletedByUserId: record.deletedByUserId,
        deletedByUserFullName: record.deletedByUserFullName,
        deletionReason: record.deletionReason,
      }),
    );
  }

  async sendAdultoMayorToTrash(
    adultoMayorId: string,
    command: SendAdultoMayorToTrashRequest,
    actor: AuthUser,
  ): Promise<void> {
    this.ensureCanManageTrash(actor);
    const scope = this.resolveTrashScopeOrThrow(actor);
    const deleted = await this.adultosMayoresRepository.sendToTrash({
      id: adultoMayorId,
      actorUserId: actor.id,
      tenantId: scope.type === "tenant" ? scope.tenantId : null,
      reason: command.reason,
    });

    if (!deleted) throw new NotFoundException("Adulto mayor no encontrado.");
  }

  async restoreAdultoMayor(adultoMayorId: string, actor: AuthUser): Promise<void> {
    this.ensureCanManageTrash(actor);
    const scope = this.resolveTrashScopeOrThrow(actor);
    const restored = await this.adultosMayoresRepository.restore({
      id: adultoMayorId,
      actorUserId: actor.id,
      tenantId: scope.type === "tenant" ? scope.tenantId : null,
    });

    if (!restored) throw new NotFoundException("Adulto mayor en papelera no encontrado.");
  }

  async getAdultoMayor(adultoMayorId: string, actor: AuthUser): Promise<AdultoMayorDetail> {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({
      id: adultoMayorId,
      scope,
    });

    if (record === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const documentFile = await this.adultosMayoresRepository.findDocumentByAdultoId(record.id);

    return this.toDetail(record, documentFile);
  }

  async getStatusHistory(
    adultoMayorId: string,
    query: AdultoMayorStatusHistoryQuery,
    actor: AuthUser,
  ) {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({ id: adultoMayorId, scope });

    if (record === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const history = await this.adultosMayoresRepository.findStatusHistory({
      adultoMayorId,
      scope,
      limit: query.limit,
      cursor: query.cursor,
    });

    return adultoMayorStatusHistoryResponseSchema.parse({
      entries: history.entries.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
      })),
      nextCursor: history.nextCursor,
    });
  }

  async uploadDocument(adultoMayorId: string, file: AdultoMayorPdfUpload, actor: AuthUser) {
    this.ensureCanManage(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({ id: adultoMayorId, scope });

    if (record === null) throw new NotFoundException("Adulto mayor no encontrado.");
    this.validatePdf(file);

    const previous = await this.adultosMayoresRepository.findDocumentByAdultoId(adultoMayorId);
    const stored = await this.filesStorage.savePdf(adultoMayorId, file);
    const document: AdultoMayorDocumentRecord = {
      id: randomUUID(),
      adultoMayorId,
      ...stored,
      uploadedByUserId: actor.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const saved = await this.adultosMayoresRepository.saveDocument(document);

    if (previous !== null && previous.relativePath !== saved.relativePath) {
      await this.filesStorage.deleteFile(previous.relativePath);
    }

    return this.toDocumentResponse(saved);
  }

  async downloadDocument(adultoMayorId: string, actor: AuthUser) {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({ id: adultoMayorId, scope });
    if (record === null) throw new NotFoundException("Adulto mayor no encontrado.");
    const document = await this.adultosMayoresRepository.findDocumentByAdultoId(adultoMayorId);
    if (document === null)
      throw new NotFoundException("Este adulto mayor no tiene un PDF cargado.");

    return {
      buffer: await this.filesStorage.readFile(document.relativePath),
      contentType: document.mimeType,
      filename: document.originalName,
    };
  }

  async deleteDocument(adultoMayorId: string, actor: AuthUser): Promise<void> {
    this.ensureCanManage(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.adultosMayoresRepository.findById({ id: adultoMayorId, scope });
    if (record === null) throw new NotFoundException("Adulto mayor no encontrado.");
    const deleted = await this.adultosMayoresRepository.deleteDocument(adultoMayorId);
    if (deleted !== null) await this.filesStorage.deleteFile(deleted.relativePath);
  }

  async createAdultoMayor(
    command: CreateAdultoMayorRequest,
    actor: AuthUser,
  ): Promise<AdultoMayorDetail> {
    this.ensureCanManage(actor);
    const tenantId = resolveAdultoMayorTenantForCreate(actor, command.tenantId);

    if (tenantId === null) {
      throw new BadRequestException("Selecciona el centro al que pertenece el adulto mayor.");
    }

    const deathDate = command.deathDate ?? null;
    assertAdultoMayorStatusData({
      status: command.status,
      birthDate: command.birthDate,
      deathDate,
    });

    if (
      actor.role !== "super_admin" &&
      command.tenantId !== null &&
      command.tenantId !== tenantId
    ) {
      throw new ForbiddenException("No puedes crear adultos mayores en otro centro.");
    }

    const [location, selectedEps] = await Promise.all([
      this.ubicacionesService.resolveDepartmentMunicipalityPair(
        command.departmentId,
        command.municipalityId,
      ),
      this.epsService.resolveForWrite(command.epsId),
    ]);

    await this.ensureDocumentIsUnique({
      tenantId,
      documentType: command.documentType,
      documentNumber: command.documentNumber,
    });

    try {
      const record = await this.adultosMayoresRepository.create(
        {
          ...command,
          deathDate,
          departmentId: location.department.id,
          municipalityId: location.municipality.id,
          department: location.department.name,
          municipality: location.municipality.name,
          epsId: selectedEps?.id ?? null,
          tenantId,
        },
        {
          actorUserId: actor.id,
          action: "adultos-mayores.created",
          targetTenantId: tenantId,
          summary: `Adulto mayor creado: ${command.firstName} ${command.firstSurname}`,
          metadata: {
            documentType: command.documentType,
            documentNumber: command.documentNumber,
          },
        },
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async updateAdultoMayor(
    adultoMayorId: string,
    command: UpdateAdultoMayorRequest,
    actor: AuthUser,
  ): Promise<AdultoMayorDetail> {
    this.ensureCanManage(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const currentRecord = await this.adultosMayoresRepository.findById({
      id: adultoMayorId,
      scope,
    });

    if (currentRecord === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const deathDate = command.deathDate ?? null;
    assertAdultoMayorStatusData({
      status: command.status,
      birthDate: command.birthDate,
      deathDate,
    });

    const statusChanged = currentRecord.status !== command.status;
    const statusChangeReason = command.statusChangeReason ?? null;

    if (statusChanged && currentRecord.status === "deceased" && command.status === "alive") {
      if (!canCorrectDeceasedStatus(actor)) {
        throw new ForbiddenException(
          "No tienes permisos para corregir el estado de fallecimiento.",
        );
      }

      if (statusChangeReason === null) {
        throw new BadRequestException("Indica el motivo para corregir el estado de fallecimiento.");
      }
    }

    const [location, selectedEps] = await Promise.all([
      this.ubicacionesService.resolveDepartmentMunicipalityPair(
        command.departmentId,
        command.municipalityId,
      ),
      this.epsService.resolveForWrite(command.epsId, currentRecord.epsId),
    ]);

    await this.ensureDocumentIsUnique({
      tenantId: currentRecord.tenantId,
      documentType: command.documentType,
      documentNumber: command.documentNumber,
      excludeId: adultoMayorId,
    });

    // Nunca propagar un tenantId inesperado hacia persistencia, incluso si este caso de uso
    // se invoca por fuera del controller que aplica el schema de actualizacion.
    const { tenantId: _ignoredTenantId, ...safeCommand } = command as UpdateAdultoMayorRequest & {
      tenantId?: unknown;
    };

    try {
      const record = await this.adultosMayoresRepository.update(
        {
          ...safeCommand,
          actorUserId: actor.id,
          deathDate,
          statusChangeReason,
          departmentId: location.department.id,
          municipalityId: location.municipality.id,
          department: location.department.name,
          municipality: location.municipality.name,
          epsId: selectedEps?.id ?? null,
          id: adultoMayorId,
        },
        {
          actorUserId: actor.id,
          action: "adultos-mayores.updated",
          targetTenantId: currentRecord.tenantId,
          summary: `Adulto mayor actualizado: ${command.firstName} ${command.firstSurname}`,
          metadata: {
            before: {
              documentType: currentRecord.documentType,
              documentNumber: currentRecord.documentNumber,
              names: currentRecord.names,
              surnames: currentRecord.surnames,
            },
            after: {
              documentType: command.documentType,
              documentNumber: command.documentNumber,
              names: [command.firstName, command.middleName].filter(Boolean).join(" "),
              surnames: [command.firstSurname, command.secondSurname].filter(Boolean).join(" "),
            },
          },
        },
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveAdultosMayoresScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar adultos mayores.");
    }

    return scope;
  }

  private resolveTrashScopeOrThrow(actor: AuthUser) {
    const scope = resolveAdultosMayoresTrashScope(actor);

    if (scope === null) {
      throw new ForbiddenException(
        "No tienes un centro asociado para gestionar la papelera de adultos mayores.",
      );
    }

    return scope;
  }

  private ensureCanManage(actor: AuthUser) {
    if (!canManageAdultosMayores(actor)) {
      throw new ForbiddenException("No tienes permisos para crear o actualizar adultos mayores.");
    }
  }

  private ensureCanManageTrash(actor: AuthUser) {
    if (!canManageAdultosMayoresTrash(actor)) {
      throw new ForbiddenException(
        "No tienes permisos para gestionar la papelera de adultos mayores.",
      );
    }
  }

  private async ensureDocumentIsUnique(command: {
    tenantId: string;
    documentType: CreateAdultoMayorRequest["documentType"];
    documentNumber: string;
    excludeId?: string;
  }) {
    const existingRecord = await this.adultosMayoresRepository.findByDocument(command);

    if (existingRecord !== null) {
      throw new ConflictException(
        existingRecord.deletedAt !== undefined && existingRecord.deletedAt !== null
          ? "El adulto mayor con ese documento está en la papelera. Puedes restaurarlo desde la papelera antes de crearlo nuevamente."
          : "Ya existe un adulto mayor con ese documento en este centro.",
      );
    }
  }

  private toListItem(record: AdultoMayorRecord): AdultoMayorListItem {
    return adultoMayorListItemSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      documentType: record.documentType,
      documentNumber: record.documentNumber,
      names: record.names,
      surnames: record.surnames,
      phone: record.phone,
      birthDate: record.birthDate,
      age: calculateAgeFromBirthDate(record.birthDate),
      sex: record.sex,
      status: record.status,
      deathDate: record.deathDate,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDetail(
    record: AdultoMayorRecord,
    documentFile = record.documentFile,
  ): AdultoMayorDetail {
    return adultoMayorDetailSchema.parse({
      ...this.toListItem(record),
      deathDate: record.deathDate,
      firstName: record.firstName,
      middleName: record.middleName,
      firstSurname: record.firstSurname,
      secondSurname: record.secondSurname,
      educationLevel: record.educationLevel,
      disability: record.disability,
      populationGroup: record.populationGroup,
      address: record.address,
      department: record.department,
      departmentId: record.departmentId,
      municipality: record.municipality,
      municipalityId: record.municipalityId,
      zone: record.zone,
      country: record.country,
      phoneSecondary: record.phoneSecondary,
      email: record.email,
      emergencyContactFullName: record.emergencyContactFullName,
      emergencyContactRelationship: record.emergencyContactRelationship,
      emergencyContactPhone: record.emergencyContactPhone,
      emergencyContactAddress: record.emergencyContactAddress,
      bloodType: record.bloodType,
      sisben: record.sisben,
      healthRegime: record.healthRegime,
      epsId: record.epsId,
      epsName: record.epsName,
      eps: record.eps,
      livesWithSomeone: record.livesWithSomeone,
      companion: record.companion,
      economicIncome: record.economicIncome,
      socialProgramBeneficiary: record.socialProgramBeneficiary,
      documentFile: documentFile === null ? null : this.toDocumentResponse(documentFile),
    });
  }

  private validatePdf(file: AdultoMayorPdfUpload): void {
    if (file.mimeType !== "application/pdf") {
      throw new BadRequestException("Solo se permiten archivos PDF.");
    }
    if (file.sizeBytes <= 0 || file.sizeBytes > MAX_ADULTO_MAYOR_PDF_SIZE_BYTES) {
      throw new BadRequestException("El PDF no puede superar 10 MB.");
    }
  }

  private toDocumentResponse(document: AdultoMayorDocumentRecord) {
    return {
      id: document.id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      createdAt: document.createdAt.toISOString(),
    };
  }

  private throwConflictForUniqueViolation(error: unknown): never | void {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictException("Ya existe un adulto mayor con ese documento en este centro.");
    }
  }
}
