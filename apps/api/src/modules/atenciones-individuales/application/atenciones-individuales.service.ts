import {
  type AtencionIndividualHistoryResponse,
  medicalAttentionHistoryResponseSchema,
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
import { randomUUID } from "node:crypto";

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
  AtencionIndividualStoredFileNotFoundError,
  type AtencionesIndividualesFilesStorage,
} from "../domain/atenciones-individuales-files.storage";
import {
  MAX_ATENCION_SUPPORT_FILES,
  MAX_PDF_REQUEST_SIZE_BYTES,
  validatePdfSupportUpload,
} from "../domain/pdf-support-file";
import {
  ATENCIONES_INDIVIDUALES_REPOSITORY,
  type AtencionesIndividualesRepository,
} from "../domain/atenciones-individuales.repository";

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

  async getMedicalHistoriaClinica(
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

    const records = await this.atencionesRepository.findHistoryByAdultoMayor({
      adultoMayorId,
      scope,
      createdByUserRole: "medico",
    });

    return medicalAttentionHistoryResponseSchema.parse({
      adultoMayor: this.toAdultoResumen(adultoMayor),
      atenciones: records.map((record) => this.toHistoryItem(record, actor)),
    });
  }

  async getAtencion(id: string, actor: AuthUser): Promise<AtencionIndividualDetail> {
    return this.toDetail(await this.getAccessibleAtencionOrThrow(id, actor), actor);
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

    const validatedUploads = this.validateSupportUploads(supportUploads);
    const atencionId = randomUUID();
    let storedFiles: PersistAtencionIndividualSupportFile[] = [];

    try {
      storedFiles = await this.saveSupportFiles(
        { tenantId: adultoMayor.tenantId, atencionId },
        validatedUploads,
      );

      const record = await this.atencionesRepository.create({
        ...command,
        analisis: command.analisis ?? null,
        id: atencionId,
        tenantId: adultoMayor.tenantId,
        actorUserId: actor.id,
        supportFiles: storedFiles,
      });

      return this.toDetail(record, actor);
    } catch (error) {
      await this.deleteFilesBestEffort(storedFiles);
      throw error;
    }
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

    const supportUploads = this.validateSupportUploads(options.supportUploads ?? []);
    const removedSupportFileIds = options.removedSupportFileIds ?? [];

    this.ensureSupportFileRemovals(currentRecord.supportFiles, removedSupportFileIds);
    const finalSupportFileCount =
      currentRecord.supportFiles.length -
      new Set(removedSupportFileIds).size +
      supportUploads.length;

    if (finalSupportFileCount > MAX_ATENCION_SUPPORT_FILES) {
      throw new BadRequestException("Puedes adjuntar maximo 3 soportes.");
    }

    let storedFiles: PersistAtencionIndividualSupportFile[] = [];

    try {
      storedFiles = await this.saveSupportFiles(
        { tenantId: currentRecord.tenantId, atencionId: id },
        supportUploads,
      );

      const saved = await this.atencionesRepository.update({
        ...command,
        analisis: command.analisis ?? null,
        id,
        actorUserId: actor.id,
        removedSupportFileIds,
        supportFiles: storedFiles,
      });

      await this.deleteFilesBestEffort(saved.removedFiles);

      return this.toDetail(saved.record, actor);
    } catch (error) {
      await this.deleteFilesBestEffort(storedFiles);
      throw error;
    }
  }

  async downloadSupportFile(id: string, fileId: string, actor: AuthUser) {
    const record = await this.getAccessibleAtencionOrThrow(id, actor);
    const supportRecord = record.supportFiles.find((item) => item.id === fileId);

    if (supportRecord === undefined) {
      throw new NotFoundException("El soporte solicitado no existe para esta atencion.");
    }

    let storedFile;

    try {
      storedFile = await this.filesStorage.readFile(
        supportRecord.relativePath,
        supportRecord.originalName,
        supportRecord.mimeType,
      );
    } catch (error) {
      if (error instanceof AtencionIndividualStoredFileNotFoundError) {
        throw new NotFoundException("El archivo solicitado ya no esta disponible.");
      }

      throw error;
    }

    await this.atencionesRepository.recordSupportFileDownload({
      atencionId: record.id,
      tenantId: record.tenantId,
      fileId: supportRecord.id,
      actorUserId: actor.id,
    });

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

  private async getAccessibleAtencionOrThrow(
    id: string,
    actor: AuthUser,
  ): Promise<AtencionIndividualRecord> {
    this.ensureCanAccessHistory(actor);
    const record = await this.atencionesRepository.findById({
      id,
      scope: this.resolveScopeOrThrow(actor),
    });

    if (record === null) {
      throw new NotFoundException("Atencion individual no encontrada.");
    }

    if (!canViewAtencionIndividual(actor, record)) {
      throw new ForbiddenException(
        "No puedes consultar atenciones registradas por otro profesional.",
      );
    }

    return record;
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

  private validateSupportUploads(
    uploads: BufferedAtencionIndividualUpload[],
  ): BufferedAtencionIndividualUpload[] {
    if (uploads.length > MAX_ATENCION_SUPPORT_FILES) {
      throw new BadRequestException("Puedes adjuntar maximo 3 soportes.");
    }

    const totalSizeBytes = uploads.reduce((total, upload) => total + upload.sizeBytes, 0);

    if (totalSizeBytes > MAX_PDF_REQUEST_SIZE_BYTES) {
      throw new BadRequestException("La carga completa de PDFs puede pesar maximo 30 MB.");
    }

    return uploads.map(validatePdfSupportUpload);
  }

  private ensureSupportFileRemovals(
    currentFiles: AtencionIndividualSupportFileRecord[],
    removedSupportFileIds: string[],
  ) {
    const removableIds = new Set(currentFiles.map((file) => file.id));

    for (const fileId of removedSupportFileIds) {
      if (!removableIds.has(fileId)) {
        throw new BadRequestException(
          "Uno de los soportes a eliminar no pertenece a esta atencion.",
        );
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

  private async deleteFilesBestEffort(files: Array<{ relativePath: string }>): Promise<void> {
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

  private toDetail(record: AtencionIndividualRecord, actor: AuthUser): AtencionIndividualDetail {
    const access = resolveAtencionIndividualHistoryAccess(actor, record);

    if (access === null) {
      throw new ForbiddenException(
        "No puedes consultar atenciones registradas por otro profesional.",
      );
    }

    return atencionIndividualDetailSchema.parse({
      ...record,
      adultoMayor: this.toAdultoResumen(record.adultoMayor),
      access,
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
      throw new ForbiddenException(
        "No puedes consultar atenciones registradas por otro profesional.",
      );
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
