import {
  type AtencionIndividualHistoryResponse,
  type AtencionIndividualAdultoResumen,
  type AtencionIndividualDetail,
  type AuthUser,
  type CreateAtencionIndividualRequest,
  type UpdateAtencionIndividualRequest,
  atencionIndividualAdultoResumenSchema,
  atencionIndividualDetailSchema,
  atencionIndividualHistoryResponseSchema,
} from "@cuidarte/contracts";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { calculateAgeFromBirthDate } from "../../adultos-mayores/application/age";
import {
  canAccessAtencionIndividualHistory,
  canCreateAtencionIndividual,
  canEditOwnedAtencionIndividual,
  canEditAtencionIndividual,
  canViewAtencionIndividual,
  resolveAtencionIndividualHistoryAccess,
  resolveAtencionIndividualScope,
} from "../domain/atencion-individual.policy";
import {
  type AtencionIndividualAdultoRecord,
  type AtencionIndividualHistoryItemRecord,
  type AtencionIndividualRecord,
  type AtencionIndividualScope,
  type AtencionIndividualSupportFileRecord,
  type BufferedAtencionIndividualUpload,
  type PersistAtencionIndividualSupportFile,
} from "../domain/atencion-individual.types";
import {
  ATENCIONES_INDIVIDUALES_FILES_STORAGE,
  type AtencionesIndividualesFilesStorage,
} from "../domain/atenciones-individuales-files.storage";
import {
  ATENCIONES_INDIVIDUALES_REPOSITORY,
  type AtencionesIndividualesRepository,
} from "../domain/atenciones-individuales.repository";

const MAX_SUPPORT_FILES = 3;

@Injectable()
export class AtencionesIndividualesService {
  constructor(
    @Inject(ATENCIONES_INDIVIDUALES_REPOSITORY)
    private readonly atencionesRepository: AtencionesIndividualesRepository,
    @Inject(ATENCIONES_INDIVIDUALES_FILES_STORAGE)
    private readonly filesStorage: AtencionesIndividualesFilesStorage,
  ) {}

  async lookupAdultoMayor(adultoMayorId: string, actor: AuthUser) {
    this.ensureCanCreate(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const suggestedConsecutive = await this.atencionesRepository.peekNextConsecutive(
      adultoMayor.tenantId,
    );

    return {
      adultoMayor: this.toAdultoResumen(adultoMayor),
      suggestedConsecutive,
    };
  }

  async getHistoriaClinica(
    adultoMayorId: string,
    actor: AuthUser,
  ): Promise<AtencionIndividualHistoryResponse> {
    this.ensureCanAccessHistory(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    const historyQuery = canCreateAtencionIndividual(actor)
      ? {
          adultoMayorId,
          scope,
          createdByUserId: actor.id,
        }
      : {
          adultoMayorId,
          scope,
        };
    const records = await this.atencionesRepository.findHistoryByAdultoMayor(historyQuery);

    return atencionIndividualHistoryResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
      atenciones: records.map((record) => this.toHistoryItem(record, actor)),
    });
  }

  async getAtencion(id: string, actor: AuthUser): Promise<AtencionIndividualDetail> {
    this.ensureCanAccessHistory(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.atencionesRepository.findById({ id, scope });

    if (record === null) {
      throw new NotFoundException("Atencion individual no encontrada.");
    }

    if (!canViewAtencionIndividual(actor, record)) {
      throw new ForbiddenException("No puedes consultar atenciones registradas por otro profesional.");
    }

    return this.toDetail(record);
  }

  async createAtencion(
    command: CreateAtencionIndividualRequest,
    actor: AuthUser,
    supportUploads: BufferedAtencionIndividualUpload[] = [],
  ): Promise<AtencionIndividualDetail> {
    this.ensureCanEdit(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const adultoMayor = await this.atencionesRepository.findAdultoMayorById({
      adultoMayorId: command.adultoMayorId,
      scope,
    });

    if (adultoMayor === null) {
      throw new NotFoundException("Adulto mayor no encontrado.");
    }

    await this.ensureConsecutiveIsUnique({
      tenantId: adultoMayor.tenantId,
      consecutive: command.consecutive,
    });

    this.ensureSupportFileLimit(supportUploads.length);
    let record: AtencionIndividualRecord;
    let storedFiles: PersistAtencionIndividualSupportFile[] = [];

    try {
      record = await this.atencionesRepository.create({
        ...command,
        tenantId: adultoMayor.tenantId,
        actorUserId: actor.id,
        supportFiles: [],
      });

      storedFiles = await this.saveSupportFiles(
        { tenantId: adultoMayor.tenantId, atencionId: record.id },
        supportUploads,
      );

      if (storedFiles.length > 0) {
        const saved = await this.atencionesRepository.update({
          ...command,
          id: record.id,
          actorUserId: actor.id,
          removedSupportFileIds: [],
          supportFiles: storedFiles,
        });
        record = saved.record;
      }
    } catch (error) {
      await this.deleteFilesBestEffort(storedFiles);
      throw error;
    }

    return this.toDetail(record);
  }

  async updateAtencion(
    id: string,
    command: UpdateAtencionIndividualRequest,
    actor: AuthUser,
    options: {
      supportUploads?: BufferedAtencionIndividualUpload[];
      removedSupportFileIds?: string[];
    } = {},
  ): Promise<AtencionIndividualDetail> {
    this.ensureCanEdit(actor);
    const scope = this.resolveScopeOrThrow(actor);
    const currentRecord = await this.atencionesRepository.findById({ id, scope });

    if (currentRecord === null) {
      throw new NotFoundException("Atencion individual no encontrada.");
    }

    if (!canEditOwnedAtencionIndividual(actor, currentRecord)) {
      throw new ForbiddenException("Solo puedes editar atenciones registradas por ti.");
    }

    await this.ensureConsecutiveIsUnique({
      tenantId: currentRecord.tenantId,
      consecutive: command.consecutive,
      excludeId: id,
    });

    const supportUploads = options.supportUploads ?? [];
    const removedSupportFileIds = options.removedSupportFileIds ?? [];

    this.ensureSupportFileRemovals(currentRecord.supportFiles, removedSupportFileIds);
    this.ensureSupportFileLimit(
      currentRecord.supportFiles.length - new Set(removedSupportFileIds).size + supportUploads.length,
    );

    const storedFiles = await this.saveSupportFiles(
      { tenantId: currentRecord.tenantId, atencionId: id },
      supportUploads,
    );

    try {
      const saved = await this.atencionesRepository.update({
        ...command,
        id,
        actorUserId: actor.id,
        removedSupportFileIds,
        supportFiles: storedFiles,
      });

      await this.deleteFilesBestEffort(saved.removedFiles);

      return this.toDetail(saved.record);
    } catch (error) {
      await this.deleteFilesBestEffort(storedFiles);
      throw error;
    }
  }

  async downloadSupportFile(id: string, fileId: string, actor: AuthUser) {
    const detail = await this.getAtencion(id, actor);
    const file = detail.supportFiles.find((item) => item.id === fileId);

    if (file === undefined) {
      throw new NotFoundException("El soporte solicitado no existe para esta atencion.");
    }

    const record = (await this.atencionesRepository.findById({
      id,
      scope: this.resolveScopeOrThrow(actor),
    })) as AtencionIndividualRecord;
    const supportRecord = record.supportFiles.find((item) => item.id === fileId);

    if (supportRecord === undefined) {
      throw new NotFoundException("El soporte solicitado no existe para esta atencion.");
    }

    const storedFile = await this.filesStorage.readFile(
      supportRecord.relativePath,
      supportRecord.originalName,
      supportRecord.mimeType,
    );

    return {
      buffer: storedFile.buffer,
      contentType: storedFile.contentType,
      filename: storedFile.originalName,
      disposition: "attachment" as const,
    };
  }

  private resolveScopeOrThrow(actor: AuthUser): AtencionIndividualScope {
    const scope = resolveAtencionIndividualScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes un centro asociado para gestionar atenciones.");
    }

    return scope;
  }

  private ensureCanEdit(actor: AuthUser) {
    if (!canEditAtencionIndividual(actor)) {
      throw new ForbiddenException(
        "Solo el personal clinico autorizado puede crear o editar atenciones individuales.",
      );
    }
  }

  private ensureCanCreate(actor: AuthUser) {
    if (!canCreateAtencionIndividual(actor)) {
      throw new ForbiddenException(
        "Solo el personal clinico autorizado puede iniciar atenciones individuales.",
      );
    }
  }

  private ensureCanAccessHistory(actor: AuthUser) {
    if (!canAccessAtencionIndividualHistory(actor)) {
      throw new ForbiddenException(
        "No tienes permisos para consultar la historia clinica de este adulto mayor.",
      );
    }
  }

  private async ensureConsecutiveIsUnique(command: {
    tenantId: string;
    consecutive: number;
    excludeId?: string;
  }) {
    const existingRecord = await this.atencionesRepository.findByConsecutive(command);

    if (existingRecord !== null) {
      throw new ConflictException("Ya existe una atencion con ese consecutivo en este centro.");
    }
  }

  private ensureSupportFileLimit(totalFiles: number) {
    if (totalFiles > MAX_SUPPORT_FILES) {
      throw new BadRequestException("Puedes adjuntar maximo 3 soportes.");
    }
  }

  private ensureSupportFileRemovals(
    currentFiles: AtencionIndividualSupportFileRecord[],
    removedSupportFileIds: string[],
  ) {
    const removableIds = new Set(currentFiles.map((file) => file.id));

    for (const fileId of removedSupportFileIds) {
      if (!removableIds.has(fileId)) {
        throw new BadRequestException("Uno de los soportes a eliminar no pertenece a esta atencion.");
      }
    }
  }

  private async saveSupportFiles(
    atencion: { tenantId: string; atencionId: string },
    uploads: BufferedAtencionIndividualUpload[],
  ): Promise<PersistAtencionIndividualSupportFile[]> {
    const savedFiles: PersistAtencionIndividualSupportFile[] = [];

    try {
      for (const upload of uploads) {
        savedFiles.push(await this.filesStorage.saveFile(atencion, upload));
      }
    } catch (error) {
      await this.deleteFilesBestEffort(savedFiles);
      throw error;
    }

    return savedFiles;
  }

  private async deleteFilesBestEffort(
    files: Array<{ relativePath: string }>,
  ): Promise<void> {
    await Promise.allSettled(files.map((file) => this.filesStorage.deleteFile(file.relativePath)));
  }

  private toAdultoResumen(record: AtencionIndividualAdultoRecord): AtencionIndividualAdultoResumen {
    return atencionIndividualAdultoResumenSchema.parse({
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

  private toDetail(record: AtencionIndividualRecord): AtencionIndividualDetail {
    return atencionIndividualDetailSchema.parse({
      ...record,
      adultoMayor: this.toAdultoResumen(record.adultoMayor),
      supportFiles: record.supportFiles.map((file) => ({
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt.toISOString(),
      })),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toHistoryItem(record: AtencionIndividualHistoryItemRecord, actor: AuthUser) {
    const access = resolveAtencionIndividualHistoryAccess(actor, record);

    if (access === null) {
      throw new ForbiddenException("No puedes consultar atenciones registradas por otro profesional.");
    }

    return {
      id: record.id,
      adultoMayorId: record.adultoMayorId,
      attentionDate: record.attentionDate,
      modalidad: record.modalidad,
      tipoConsulta: record.tipoConsulta,
      nombreConsulta: record.nombreConsulta,
      consecutive: record.consecutive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      professional: {
        userId: record.createdByUserId,
        fullName: record.createdByUserFullName,
        role: record.createdByUserRole,
      },
      access,
    };
  }
}
