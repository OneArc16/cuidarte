import {
  type ActividadGrupalEditDetail,
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalEmpleadoOption,
  type ActividadGrupalIntegranteOption,
  type ActividadGrupalIntegranteOptionsQuery,
  type ActividadGrupalListItem,
  type ActividadGrupalListQuery,
  type ActividadGrupalOrganizer,
  type ActividadGrupalResponsibleDepartment,
  type ActividadGrupalSupportFile,
  type ActividadGrupalTenantOption,
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalActaCorrectionPreviewResponse,
  type ApplyActividadGrupalActaCorrectionRequest,
  type ApplyActividadGrupalActaCorrectionResponse,
  type CorrectActividadGrupalActaNumberRequest,
  type UpdateActividadGrupalRequest,
  type AuthUser,
  type CreateActividadGrupalRequest,
  type SaveActividadGrupalDiligenciamiento,
  actividadGrupalActaCorrectionPreviewResponseSchema,
  applyActividadGrupalActaCorrectionResponseSchema,
  actividadGrupalEditDetailSchema,
  actividadGrupalDiligenciamientoDetailSchema,
  actividadGrupalEmpleadoOptionSchema,
  actividadGrupalIntegranteOptionSchema,
  actividadGrupalListItemSchema,
  actividadGrupalSupportFileSchema,
  actividadGrupalTenantOptionSchema,
  actividadGrupalTipoSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";

import {
  resolveActividadGrupalTenantForCreate,
  canEditActividadGrupal,
  canManageActividadesGrupales,
  canCorrectActividadGrupalActaNumber,
  canBulkCorrectActividadGrupalActaNumbers,
  canViewActividadGrupal,
  canTrashActividadGrupal,
  resolvePermittedActividadGrupalOrganizers,
  resolveActividadesGrupalesScope,
} from "../domain/actividad-grupal.policy";
import { assertAdultoMayorRecordDateAllowed } from "../../adultos-mayores/domain/adulto-mayor-status-policy";
import { ActividadGrupalTiposService } from "../../actividad-grupal-tipos/application/actividad-grupal-tipos.service";
import {
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalSupportFileRecord,
  type BufferedActividadGrupalUpload,
  ActaCorrectionConflictError,
} from "../domain/actividad-grupal.types";
import {
  ACTIVIDADES_GRUPALES_FILES_STORAGE,
  type ActividadesGrupalesFilesStorage,
} from "../domain/actividades-grupales-files.storage";
import {
  ACTIVIDADES_GRUPALES_REPOSITORY,
  type ActividadesGrupalesRepository,
} from "../domain/actividades-grupales.repository";

const MAX_SUPPORT_PHOTOS = 5;
const MAX_PHOTO_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type SaveActividadGrupalDiligenciamientoCommand = {
  activityId: string;
  payload: SaveActividadGrupalDiligenciamiento;
  newPhotos: BufferedActividadGrupalUpload[];
  newPdf: BufferedActividadGrupalUpload | null;
};

type DownloadActividadGrupalSupportFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  disposition: "inline" | "attachment";
};

export type ActividadGrupalActaExportData = {
  detail: ActividadGrupalDiligenciamientoDetail;
  photoFiles: ActividadGrupalSupportFileRecord[];
  pdfFile: ActividadGrupalSupportFileRecord | null;
};

@Injectable()
export class ActividadesGrupalesService {
  constructor(
    @Inject(ACTIVIDADES_GRUPALES_REPOSITORY)
    private readonly actividadesGrupalesRepository: ActividadesGrupalesRepository,
    @Inject(ACTIVIDADES_GRUPALES_FILES_STORAGE)
    private readonly filesStorage: ActividadesGrupalesFilesStorage,
    @Inject(ActividadGrupalTiposService)
    private readonly actividadGrupalTiposService: Pick<
      ActividadGrupalTiposService,
      "listForSessionForm" | "resolveForSessionCreate" | "resolveForSessionUpdate"
    > = {
      async listForSessionForm() {
        return [];
      },
      async resolveForSessionCreate(activityTypeId, tenantId) {
        return {
          id: activityTypeId,
          tenantId,
          name: "Actividad",
          normalizedName: "actividad",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deactivatedAt: null,
        };
      },
      async resolveForSessionUpdate(activityTypeId, tenantId) {
        return {
          id: activityTypeId,
          tenantId,
          name: "Actividad",
          normalizedName: "actividad",
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deactivatedAt: null,
        };
      },
    },
  ) {}

  async listActividadesGrupales(
    query: ActividadGrupalListQuery,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem[]> {
    const scope = this.resolveScopeOrThrow(actor);
    const effectiveTenantId = this.resolveListTenantId(scope, query.tenantId);
    const permittedOrganizers = resolvePermittedActividadGrupalOrganizers(actor);
    const records = await this.actividadesGrupalesRepository.findMany({
      search: query.search,
      activityType: query.activityType,
      activityTypeId: query.activityTypeId,
      organizer: query.organizer,
      activityMonth: query.activityMonth,
      tenantId: effectiveTenantId,
      scope,
      permittedOrganizers,
    });

    return records
      .filter((record) => canViewActividadGrupal(record, actor))
      .map((record) => this.toListItem(record, actor));
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
  ): Promise<ActividadGrupalFormOptionsResponse> {
    this.ensureCanManageActivities(actor);
    const tenantId = this.resolveTenantIdForForm(actor, query.tenantId);
    const [empleados, activityTypes] = await Promise.all([
      this.actividadesGrupalesRepository.findActiveEmpleadoOptions(tenantId),
      this.actividadGrupalTiposService.listForSessionForm(tenantId),
    ]);

    return {
      empleados: empleados.map((empleado) => actividadGrupalEmpleadoOptionSchema.parse(empleado)),
      activityTypes: activityTypes.map((activityType) =>
        actividadGrupalTipoSchema.parse(activityType),
      ),
    };
  }

  async createActividadGrupal(
    command: CreateActividadGrupalRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem> {
    this.ensureCanManageActivities(actor);
    this.resolveScopeOrThrow(actor);

    const tenantId = this.resolveTenantIdForCreate(actor, command.tenantId);
    await this.actividadGrupalTiposService.resolveForSessionCreate(
      command.activityTypeId,
      tenantId,
    );
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
      activityType: null,
      activityTypeId: command.activityTypeId,
      activityDate: command.activityDate,
      startTime: command.startTime,
      endTime: command.endTime,
      organizer: command.organizer,
      employeeIds: command.employeeIds,
    });

    return this.toListItem(record, actor);
  }

  async getActividadGrupalForEdit(
    activityId: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalEditDetail> {
    this.ensureCanManageActivities(actor);
    const detail = await this.getEditableActivityOrThrow(activityId, actor);

    return actividadGrupalEditDetailSchema.parse({
      ...this.toListItem(detail.activity, actor),
      actaOrganizer: detail.activity.actaOrganizer,
      actaSequence: detail.activity.actaSequence,
      previousActaNumber: detail.activity.previousActaNumber,
      employeeIds: detail.assignedProfessionals.map((professional) => professional.id),
    });
  }

  async updateActividadGrupal(
    activityId: string,
    command: UpdateActividadGrupalRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem> {
    this.ensureCanManageActivities(actor);
    const detail = await this.getEditableActivityOrThrow(activityId, actor);
    await this.actividadGrupalTiposService.resolveForSessionUpdate(
      command.activityTypeId,
      detail.activity.tenantId,
      detail.activity.activityTypeId,
    );
    const activeEmpleados = await this.actividadesGrupalesRepository.findActiveEmpleadoOptions(
      detail.activity.tenantId,
    );
    const activeEmpleadoIds = new Set(activeEmpleados.map((empleado) => empleado.id));
    const hasInvalidEmpleado = command.employeeIds.some(
      (employeeId) => !activeEmpleadoIds.has(employeeId),
    );

    if (hasInvalidEmpleado) {
      throw new BadRequestException(
        "Selecciona empleados activos del centro para actualizar la actividad.",
      );
    }

    this.assertIntegrantesDateAllowed(detail.integrantes, command.activityDate);

    const record = await this.actividadesGrupalesRepository.update({
      activityId,
      actorUserId: actor.id,
      activityName: command.activityName,
      activityType: detail.activity.activityType,
      activityTypeId: command.activityTypeId,
      activityDate: command.activityDate,
      startTime: command.startTime,
      endTime: command.endTime,
      organizer: detail.activity.organizer,
      employeeIds: command.employeeIds,
    });

    return this.toListItem(record, actor);
  }

  async correctActividadGrupalActaNumber(
    activityId: string,
    command: CorrectActividadGrupalActaNumberRequest,
    actor: AuthUser,
  ): Promise<ActividadGrupalListItem> {
    this.ensureCanCorrectActa(actor);
    const detail = await this.getActivityForActaCorrectionOrThrow(activityId);

    if (detail.activity.organizer === command.organizer) {
      throw new ConflictException("El acta ya pertenece a esa serie.");
    }

    const record = await this.actividadesGrupalesRepository.correctActaNumber({
      activityId,
      actorUserId: actor.id,
      organizer: command.organizer,
      reason: command.reason,
    });

    return this.toListItem(record, actor);
  }

  async previewActividadGrupalActaCorrection(
    tenantId: string,
    organizer: ActividadGrupalOrganizer | null,
    actor: AuthUser,
  ): Promise<ActividadGrupalActaCorrectionPreviewResponse> {
    this.ensureCanCorrectActa(actor, true);
    const preview = await this.actividadesGrupalesRepository.previewActaNumberCorrection(
      tenantId,
      actor.id,
      organizer,
    );

    return actividadGrupalActaCorrectionPreviewResponseSchema.parse({
      operationToken: preview.operationToken,
      tenantId: preview.tenantId,
      previewExpiresAt: preview.previewExpiresAt.toISOString(),
      totalCount: preview.totalCount,
      changedCount: preview.changedCount,
      unchangedCount: preview.unchangedCount,
      warningCount: preview.warningCount,
      rows: preview.rows,
    });
  }

  async applyActividadGrupalActaCorrection(
    command: ApplyActividadGrupalActaCorrectionRequest,
    actor: AuthUser,
  ): Promise<ApplyActividadGrupalActaCorrectionResponse> {
    this.ensureCanCorrectActa(actor, true);

    try {
      const result = await this.actividadesGrupalesRepository.applyActaNumberCorrection({
        operationToken: command.operationToken,
        actorUserId: actor.id,
        reason: command.reason,
      });

      return applyActividadGrupalActaCorrectionResponseSchema.parse(result);
    } catch (error) {
      if (error instanceof ActaCorrectionConflictError) {
        throw new ConflictException(error.message);
      }

      throw error;
    }
  }

  async getActividadGrupalDiligenciamiento(
    activityId: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalDiligenciamientoDetail> {
    const detail = await this.getPermittedDiligenciamientoOrThrow(activityId, actor);

    return this.toDiligenciamientoDetail(detail, actor);
  }

  async getActividadGrupalActaExportData(
    activityId: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalActaExportData> {
    const record = await this.getPermittedDiligenciamientoOrThrow(activityId, actor);

    return {
      detail: this.toDiligenciamientoDetail(record, actor),
      photoFiles: record.photoFiles,
      pdfFile: record.pdfFile,
    };
  }

  async searchIntegranteOptions(
    activityId: string,
    query: ActividadGrupalIntegranteOptionsQuery,
    actor: AuthUser,
  ): Promise<ActividadGrupalIntegranteOption[]> {
    this.ensureCanManageActivities(actor);
    const detail = await this.getPermittedDiligenciamientoOrThrow(activityId, actor);
    const integrantes = await this.actividadesGrupalesRepository.searchIntegranteOptions({
      tenantId: detail.activity.tenantId,
      search: query.search,
    });

    return integrantes.map((integrante) => actividadGrupalIntegranteOptionSchema.parse(integrante));
  }

  async saveActividadGrupalDiligenciamiento(
    command: SaveActividadGrupalDiligenciamientoCommand,
    actor: AuthUser,
  ): Promise<ActividadGrupalDiligenciamientoDetail> {
    this.ensureCanManageActivities(actor);
    const detail = await this.getPermittedDiligenciamientoOrThrow(command.activityId, actor);
    const removedPhotoIds = new Set(command.payload.removedPhotoFileIds);
    const currentPhotoFiles = detail.photoFiles.filter((file) => !removedPhotoIds.has(file.id));

    this.assertRemovablePhotoFiles(detail.photoFiles, removedPhotoIds);
    this.validateUploads(currentPhotoFiles.length, command.newPhotos, command.newPdf);

    const integrantes = await this.actividadesGrupalesRepository.findIntegrantesByIds(
      detail.activity.tenantId,
      command.payload.integranteIds,
    );

    if (integrantes.length !== new Set(command.payload.integranteIds).size) {
      throw new BadRequestException(
        "Selecciona adultos mayores activos del centro para diligenciar la sesion.",
      );
    }

    this.assertIntegrantesDateAllowed(integrantes, detail.activity.activityDate);

    const storedFiles = await this.storeNewUploads(detail, command.newPhotos, command.newPdf);

    try {
      const saved = await this.actividadesGrupalesRepository.saveDiligenciamiento({
        activityId: command.activityId,
        actorUserId: actor.id,
        objectives: command.payload.objectives,
        development: command.payload.development,
        conclusion: command.payload.conclusion,
        responsibleDepartment: command.payload.responsibleDepartment,
        integranteIds: command.payload.integranteIds,
        removedPhotoFileIds: command.payload.removedPhotoFileIds,
        removePdfFile: command.payload.removePdfFile || command.newPdf !== null,
        newFiles: storedFiles,
      });

      await this.deleteFilesBestEffort(saved.removedFiles);

      return this.toDiligenciamientoDetail(saved.detail, actor);
    } catch (error) {
      await this.deleteFilesBestEffort(
        storedFiles.map((file, index) => ({
          id: `temp-${index}`,
          activityId: command.activityId,
          kind: file.kind,
          originalName: file.originalName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
          relativePath: file.relativePath,
          createdAt: new Date(),
        })),
      );
      throw error;
    }
  }

  async downloadSupportFile(
    activityId: string,
    fileId: string,
    actor: AuthUser,
  ): Promise<DownloadActividadGrupalSupportFile> {
    const detail = await this.getPermittedDiligenciamientoOrThrow(activityId, actor);
    const file = detail.photoFiles.find((item) => item.id === fileId) ?? detail.pdfFile;

    if (file === null || file.id !== fileId) {
      throw new NotFoundException("El archivo solicitado no existe para esta sesion.");
    }

    const storedFile = await this.filesStorage.readFile(
      file.relativePath,
      file.originalName,
      file.mimeType,
    );

    return {
      buffer: storedFile.buffer,
      contentType: storedFile.contentType,
      filename: storedFile.originalName,
      disposition: "inline",
    };
  }

  private async getPermittedDiligenciamientoOrThrow(
    activityId: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord> {
    const scope = this.resolveScopeOrThrow(actor);
    const detail = await this.actividadesGrupalesRepository.findById({
      activityId,
      scope,
      permittedOrganizers: resolvePermittedActividadGrupalOrganizers(actor),
    });

    if (detail === null) {
      throw new NotFoundException("La sesion grupal no fue encontrada.");
    }

    this.assertCanViewDiligenciamiento(detail, actor);

    return detail;
  }

  private async getEditableActivityOrThrow(
    activityId: string,
    actor: AuthUser,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord> {
    const scope = this.resolveScopeOrThrow(actor);
    const detail = await this.actividadesGrupalesRepository.findById({
      activityId,
      scope,
      permittedOrganizers: resolvePermittedActividadGrupalOrganizers(actor),
    });

    if (detail === null) {
      throw new NotFoundException("La actividad grupal no fue encontrada.");
    }

    this.assertCanEditActivity(detail.activity, actor);

    return detail;
  }

  private assertCanViewDiligenciamiento(
    detail: ActividadGrupalDiligenciamientoDetailRecord,
    actor: AuthUser,
  ): void {
    if (actor.role === "auditor") {
      return;
    }

    if (actor.role === "super_admin") {
      return;
    }

    if (actor.tenantId === detail.activity.tenantId) {
      return;
    }

    throw new ForbiddenException("No tienes permisos para diligenciar esta sesion.");
  }

  private assertCanEditActivity(activity: ActividadGrupalRecord, actor: AuthUser): void {
    if (!canEditActividadGrupal(activity, actor)) {
      throw new ForbiddenException("No tienes permisos para editar o eliminar esta actividad.");
    }
  }

  private ensureCanManageActivities(actor: Pick<AuthUser, "role">) {
    if (!canManageActividadesGrupales(actor)) {
      throw new ForbiddenException("No tienes permisos para crear o diligenciar actividades.");
    }
  }

  private ensureCanCorrectActa(actor: Pick<AuthUser, "role">, bulk = false): void {
    const canCorrect = bulk
      ? canBulkCorrectActividadGrupalActaNumbers(actor)
      : canCorrectActividadGrupalActaNumber(actor);

    if (!canCorrect) {
      throw new ForbiddenException("Solo un super administrador puede corregir consecutivos.");
    }
  }

  private async getActivityForActaCorrectionOrThrow(
    activityId: string,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord> {
    const detail = await this.actividadesGrupalesRepository.findById({
      activityId,
      scope: { type: "all" },
      permittedOrganizers: null,
    });

    if (detail !== null) {
      return detail;
    }

    const trashDetail = await this.actividadesGrupalesRepository.findTrashById({
      activityId,
      scope: { type: "all" },
      permittedOrganizers: null,
    });

    if (trashDetail === null) {
      throw new NotFoundException("La actividad grupal no fue encontrada.");
    }

    return {
      activity: trashDetail,
      assignedProfessionals: [],
      objectives: "",
      development: "",
      conclusion: "",
      responsibleDepartment: null,
      integrantes: [],
      photoFiles: [],
      pdfFile: null,
      diligenciamientoCreatedAt: null,
      diligenciamientoUpdatedAt: null,
    };
  }

  private async storeNewUploads(
    detail: ActividadGrupalDiligenciamientoDetailRecord,
    newPhotos: BufferedActividadGrupalUpload[],
    newPdf: BufferedActividadGrupalUpload | null,
  ) {
    const storedFiles = [];

    for (const photo of newPhotos) {
      storedFiles.push(
        await this.filesStorage.saveFile(
          {
            tenantId: detail.activity.tenantId,
            activityId: detail.activity.id,
          },
          "support_photo",
          photo,
        ),
      );
    }

    if (newPdf !== null) {
      storedFiles.push(
        await this.filesStorage.saveFile(
          {
            tenantId: detail.activity.tenantId,
            activityId: detail.activity.id,
          },
          "support_pdf",
          newPdf,
        ),
      );
    }

    return storedFiles;
  }

  private async deleteFilesBestEffort(files: ActividadGrupalSupportFileRecord[]) {
    await Promise.allSettled(files.map((file) => this.filesStorage.deleteFile(file.relativePath)));
  }

  private validateUploads(
    currentPhotoCount: number,
    newPhotos: BufferedActividadGrupalUpload[],
    newPdf: BufferedActividadGrupalUpload | null,
  ): void {
    if (currentPhotoCount + newPhotos.length > MAX_SUPPORT_PHOTOS) {
      throw new BadRequestException("Puedes adjuntar maximo 5 fotos de soporte.");
    }

    for (const photo of newPhotos) {
      if (!ALLOWED_PHOTO_MIME_TYPES.has(photo.mimeType)) {
        throw new BadRequestException("Adjunta fotos en formato JPG, PNG o WEBP.");
      }

      if (photo.sizeBytes > MAX_PHOTO_FILE_SIZE_BYTES) {
        throw new BadRequestException("Cada foto debe pesar maximo 5 MB.");
      }
    }

    if (newPdf !== null) {
      if (newPdf.mimeType !== "application/pdf") {
        throw new BadRequestException("El documento de soporte debe estar en PDF.");
      }

      if (newPdf.sizeBytes > MAX_PDF_FILE_SIZE_BYTES) {
        throw new BadRequestException("El PDF de soporte debe pesar maximo 10 MB.");
      }
    }
  }

  private assertRemovablePhotoFiles(
    photoFiles: ActividadGrupalSupportFileRecord[],
    removedPhotoIds: Set<string>,
  ): void {
    const removableIds = new Set(photoFiles.map((file) => file.id));

    for (const fileId of removedPhotoIds) {
      if (!removableIds.has(fileId)) {
        throw new BadRequestException("Solo puedes eliminar fotos que pertenezcan a la sesion.");
      }
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

  private assertIntegrantesDateAllowed(
    integrantes: Array<{ status?: "alive" | "deceased"; deathDate?: string | null }>,
    activityDate: string,
  ) {
    for (const integrante of integrantes) {
      assertAdultoMayorRecordDateAllowed({
        status: integrante.status,
        deathDate: integrante.deathDate,
        recordDate: activityDate,
      });
    }
  }

  private toListItem(record: ActividadGrupalRecord, actor: AuthUser): ActividadGrupalListItem {
    return actividadGrupalListItemSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      actaNumber: record.actaNumber,
      activityName: record.activityName,
      activityType: record.activityType,
      activityTypeId: record.activityTypeId,
      activityTypeCatalog: {
        id: record.activityTypeId,
        name: record.activityTypeName,
        isActive: record.activityTypeIsActive,
      },
      activityDate: record.activityDate,
      startTime: record.startTime,
      endTime: record.endTime,
      organizer: record.organizer,
      involvedEmployeesCount: record.involvedEmployeesCount,
      canEdit: this.canEditActivity(record, actor),
      canDelete: canTrashActividadGrupal(record, actor),
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDiligenciamientoDetail(
    detail: ActividadGrupalDiligenciamientoDetailRecord,
    actor: AuthUser,
  ): ActividadGrupalDiligenciamientoDetail {
    const baseItem = this.toListItem(detail.activity, actor);

    return actividadGrupalDiligenciamientoDetailSchema.parse({
      ...baseItem,
      actaOrganizer: detail.activity.actaOrganizer,
      actaSequence: detail.activity.actaSequence,
      previousActaNumber: detail.activity.previousActaNumber,
      canEdit: this.canEditDiligenciamiento(detail, actor),
      assignedProfessionals: detail.assignedProfessionals.map((professional) =>
        actividadGrupalEmpleadoOptionSchema.parse(professional),
      ),
      objectives: detail.objectives,
      development: detail.development,
      conclusion: detail.conclusion,
      responsibleDepartment: detail.responsibleDepartment,
      integrantes: detail.integrantes.map((integrante) =>
        actividadGrupalIntegranteOptionSchema.parse(integrante),
      ),
      photoFiles: detail.photoFiles.map((file) => this.toSupportFile(file)),
      pdfFile: detail.pdfFile === null ? null : this.toSupportFile(detail.pdfFile),
      diligenciamientoCreatedAt:
        detail.diligenciamientoCreatedAt === null
          ? null
          : detail.diligenciamientoCreatedAt.toISOString(),
      diligenciamientoUpdatedAt:
        detail.diligenciamientoUpdatedAt === null
          ? null
          : detail.diligenciamientoUpdatedAt.toISOString(),
    });
  }

  private canEditActivity(activity: ActividadGrupalRecord, actor: AuthUser): boolean {
    return canEditActividadGrupal(activity, actor);
  }

  private canEditDiligenciamiento(
    detail: ActividadGrupalDiligenciamientoDetailRecord,
    actor: AuthUser,
  ): boolean {
    if (this.canEditActivity(detail.activity, actor)) {
      return true;
    }

    return detail.assignedProfessionals.some((professional) => professional.id === actor.id);
  }

  private toSupportFile(file: ActividadGrupalSupportFileRecord): ActividadGrupalSupportFile {
    return actividadGrupalSupportFileSchema.parse({
      id: file.id,
      kind: file.kind,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      createdAt: file.createdAt.toISOString(),
    });
  }
}
