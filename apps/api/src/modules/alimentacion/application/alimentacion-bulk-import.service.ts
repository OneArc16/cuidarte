import { randomUUID } from "node:crypto";

import {
  alimentacionBulkImportConfirmResponseSchema,
  alimentacionBulkImportItemSchema,
  alimentacionBulkImportValidateResponseSchema,
  type AlimentacionBulkImportConfirmRequest,
  type AlimentacionBulkImportConfirmResponse,
  type AlimentacionBulkImportItem,
  type AlimentacionBulkImportReasonCode,
  type AlimentacionBulkImportValidateQuery,
  type AlimentacionBulkImportValidateResponse,
  type AuthUser,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { canImportAlimentacion, resolveAlimentacionScope } from "../domain/alimentacion.policy";
import {
  ALIMENTACION_FORMATO_FILES_STORAGE,
  type AlimentacionFormatoFilesStorage,
} from "../domain/alimentacion-formato-files.storage";
import {
  assertBulkImportModeMonth,
  BULK_IMPORT_EXPIRY_MINUTES,
  BULK_IMPORT_MAX_FILES,
  BULK_IMPORT_MAX_TOTAL_BYTES,
  BulkImportValidationError,
  hashBulkImportUpload,
  parseBulkImportFilename,
  validateBulkImportUpload,
} from "../domain/alimentacion-bulk-import";
import {
  ALIMENTACION_REPOSITORY,
  type AlimentacionRepository,
} from "../domain/alimentacion.repository";
import {
  type AlimentacionBulkImportItemRecord,
  type BufferedAlimentacionFormatoPdfUpload,
} from "../domain/alimentacion.types";

@Injectable()
export class AlimentacionBulkImportService {
  constructor(
    @Inject(ALIMENTACION_REPOSITORY)
    private readonly repository: AlimentacionRepository,
    @Inject(ALIMENTACION_FORMATO_FILES_STORAGE)
    private readonly storage: AlimentacionFormatoFilesStorage,
  ) {}

  async validate(
    query: AlimentacionBulkImportValidateQuery,
    uploads: BufferedAlimentacionFormatoPdfUpload[],
    actor: AuthUser,
  ): Promise<AlimentacionBulkImportValidateResponse> {
    this.ensureCanImport(actor);
    this.assertLimits(uploads);
    const tenantId = this.resolveTenant(query.tenantId, actor);
    const batchId = randomUUID();
    const expiresAt = new Date(Date.now() + BULK_IMPORT_EXPIRY_MINUTES * 60_000);
    const parsed = uploads.map((upload) => this.parseUpload(upload, query));
    const normalizedNumbers = [
      ...new Set(parsed.flatMap((item) => item.parsed?.normalizedDocumentNumber ?? [])),
    ];
    const bulkRepository = this.getBulkRepository();
    const adultos = await bulkRepository.findAdultosByNormalizedDocumentNumbers(
      tenantId,
      normalizedNumbers,
    );
    const adultosByDocument = new Map<string, typeof adultos>();
    for (const adulto of adultos) {
      const key = normalize(adulto.documentNumber);
      const current = adultosByDocument.get(key) ?? [];
      current.push(adulto);
      adultosByDocument.set(key, current);
    }

    const stagedPaths: string[] = [];
    try {
      const itemCommands = [];
      const seenKeys = new Set<string>();
      for (const candidate of parsed) {
        const itemId = randomUUID();
        let status: "ready" | "warning" | "error" = candidate.error === null ? "ready" : "error";
        let reasonCode: AlimentacionBulkImportReasonCode | null =
          candidate.error?.reasonCode ?? null;
        let reasonMessage = candidate.error?.message ?? null;
        let adultoMayorId: string | null = null;
        let adultoMayorFullName: string | null = null;
        let existingVersion: number | null = null;

        if (candidate.error === null && candidate.parsed !== null) {
          const matches = adultosByDocument.get(candidate.parsed.normalizedDocumentNumber) ?? [];
          if (matches.length === 0) {
            status = "error";
            reasonCode = "ADULTO_NOT_FOUND";
            reasonMessage =
              "No existe un adulto mayor activo con ese numero en la sede seleccionada.";
          } else if (matches.length > 1) {
            status = "error";
            reasonCode = "AMBIGUOUS_ADULTO";
            reasonMessage = "El numero de identificacion coincide con mas de un adulto mayor.";
          } else {
            const adulto = matches[0];
            if (adulto === undefined) continue;
            adultoMayorId = adulto.id;
            adultoMayorFullName = adulto.fullName;
            const logicalKey = adulto.id + ":" + candidate.parsed.deliveryMonth;
            if (seenKeys.has(logicalKey)) {
              status = "error";
              reasonCode = "DUPLICATE_IN_BATCH";
              reasonMessage = "El mismo adulto y mes aparecen mas de una vez en este lote.";
            } else {
              seenKeys.add(logicalKey);
              const versions = await this.repository.findImportedFormatoVersions({
                tenantId,
                adultoMayorId: adulto.id,
                deliveryMonth: candidate.parsed.deliveryMonth,
              });
              existingVersion = versions[0]?.version ?? null;
              if (existingVersion !== null) {
                status = "warning";
                reasonCode = "ALREADY_IMPORTED";
                reasonMessage =
                  "Ya existe una version v" +
                  existingVersion +
                  "; importar creara una nueva version.";
              }
            }
          }
        }

        let stagedRelativePath = "";
        if (candidate.validated !== null) {
          const staged = await this.storage.saveStagedFile(batchId, itemId, {
            filename: candidate.validated.originalName,
            contentType: candidate.validated.mimeType,
            buffer: candidate.validated.buffer,
          });
          stagedRelativePath = staged.relativePath;
          stagedPaths.push(staged.relativePath);
        }
        itemCommands.push({
          id: itemId,
          batchId,
          tenantId,
          originalName: candidate.upload.originalName,
          documentNumber: candidate.parsed?.documentNumber ?? null,
          normalizedDocumentNumber: candidate.parsed?.normalizedDocumentNumber ?? null,
          deliveryMonth: candidate.parsed?.deliveryMonth ?? null,
          adultoMayorId,
          adultoMayorFullName,
          sha256:
            candidate.validated === null
              ? hashBulkImportUpload(candidate.upload)
              : hashBulkImportUpload(candidate.validated),
          sizeBytes: candidate.upload.sizeBytes,
          stagedRelativePath,
          status,
          reasonCode,
          reasonMessage,
          existingVersion,
        });
      }

      await bulkRepository.createBulkImportBatch({
        id: batchId,
        tenantId,
        mode: query.mode,
        deliveryMonth: query.deliveryMonth,
        createdByUserId: actor.id,
        expiresAt,
      });
      const items = await bulkRepository.createBulkImportItems(itemCommands);
      return alimentacionBulkImportValidateResponseSchema.parse({
        batchId,
        expiresAt: expiresAt.toISOString(),
        summary: summarize(items),
        items: items.map(toContractItem),
      });
    } catch (error) {
      await Promise.all(
        stagedPaths.map((relativePath) =>
          this.storage.deleteStagedFile(relativePath).catch(() => undefined),
        ),
      );
      throw error;
    }
  }

  async confirm(
    command: AlimentacionBulkImportConfirmRequest,
    actor: AuthUser,
  ): Promise<AlimentacionBulkImportConfirmResponse> {
    this.ensureCanImport(actor);
    const bulkRepository = this.getBulkRepository();
    const batch = await bulkRepository.findBulkImportBatch(command.batchId);
    if (batch === null || batch.createdByUserId !== actor.id) {
      throw new NotFoundException("El lote de importacion no fue encontrado.");
    }
    if (batch.expiresAt.getTime() <= Date.now()) {
      throw new ConflictException(
        "El lote de importacion ha expirado. Vuelve a cargar los archivos.",
      );
    }

    const items = await bulkRepository.findBulkImportItems(command.batchId);
    const byId = new Map(items.map((item) => [item.id, item]));
    for (const selection of command.items) {
      const item = byId.get(selection.itemId);
      if (item === undefined) continue;
      if (selection.decision === "skip") {
        if (item.status !== "imported") {
          await bulkRepository.updateBulkImportItem(item.id, { status: "skipped" });
          if (item.stagedRelativePath !== "") {
            await this.storage.deleteStagedFile(item.stagedRelativePath).catch(() => undefined);
          }
        }
        continue;
      }
      if (
        item.status === "imported" ||
        item.adultoMayorId === null ||
        item.deliveryMonth === null ||
        item.stagedRelativePath === ""
      ) {
        continue;
      }
      let storedRelativePath: string | null = null;
      try {
        const staged = await this.storage.readStagedFile(
          item.stagedRelativePath,
          item.originalName,
        );
        const stored = await this.storage.saveFile(
          {
            tenantId: item.tenantId,
            adultoMayorId: item.adultoMayorId,
            deliveryMonth: item.deliveryMonth,
          },
          {
            filename: item.originalName,
            contentType: staged.contentType,
            buffer: staged.buffer,
          },
        );
        storedRelativePath = stored.relativePath;
        const version = await this.repository.createImportedFormatoVersion({
          tenantId: item.tenantId,
          adultoMayorId: item.adultoMayorId,
          deliveryMonth: item.deliveryMonth,
          originalName: item.originalName,
          storedName: stored.storedName,
          pdfRelativePath: stored.relativePath,
          mimeType: "application/pdf",
          sizeBytes: item.sizeBytes,
          importedByUserId: actor.id,
          importedAt: new Date(),
        });
        await bulkRepository.updateBulkImportItem(item.id, {
          status: "imported",
          importedVersionId: version.id,
          importedVersion: version.version,
          reasonCode: null,
          reasonMessage: null,
        });
        await this.storage.deleteStagedFile(item.stagedRelativePath).catch(() => undefined);
      } catch {
        if (storedRelativePath !== null) {
          await this.storage.deleteFile(storedRelativePath).catch(() => undefined);
        }
        await bulkRepository.updateBulkImportItem(item.id, {
          status: "error",
          reasonCode: "INVALID_PDF",
          reasonMessage: "No fue posible leer o guardar el PDF.",
        });
      }
    }
    const updatedItems = await bulkRepository.findBulkImportItems(command.batchId);
    return alimentacionBulkImportConfirmResponseSchema.parse({
      batchId: command.batchId,
      summary: summarize(updatedItems),
      items: updatedItems.map(toContractItem),
    });
  }

  async get(batchId: string, actor: AuthUser): Promise<AlimentacionBulkImportValidateResponse> {
    this.ensureCanImport(actor);
    const bulkRepository = this.getBulkRepository();
    const batch = await bulkRepository.findBulkImportBatch(batchId);
    if (batch === null || batch.createdByUserId !== actor.id) {
      throw new NotFoundException("El lote de importacion no fue encontrado.");
    }
    const items = await bulkRepository.findBulkImportItems(batchId);
    return alimentacionBulkImportValidateResponseSchema.parse({
      batchId,
      expiresAt: batch.expiresAt.toISOString(),
      summary: summarize(items),
      items: items.map(toContractItem),
    });
  }

  private parseUpload(
    upload: BufferedAlimentacionFormatoPdfUpload,
    query: AlimentacionBulkImportValidateQuery,
  ) {
    try {
      const parsed = parseBulkImportFilename(upload.originalName);
      assertBulkImportModeMonth(query.mode, query.deliveryMonth, parsed.deliveryMonth);
      const validated = validateBulkImportUpload(upload);
      return { upload, parsed, validated, error: null } as const;
    } catch (error) {
      const reasonCode =
        error instanceof BulkImportValidationError ? error.reasonCode : "INVALID_PDF";
      const message = error instanceof Error ? error.message : "El archivo PDF no es valido.";
      return { upload, parsed: null, validated: null, error: { reasonCode, message } } as const;
    }
  }

  private resolveTenant(requestedTenantId: string | null, actor: AuthUser): string {
    const scope = resolveAlimentacionScope(actor);
    if (scope === null) {
      throw new ForbiddenException("No tienes una sede habilitada para importar.");
    }
    if (scope.type === "tenant") {
      if (requestedTenantId !== null && requestedTenantId !== scope.tenantId) {
        throw new ForbiddenException("No puedes importar archivos de otra sede.");
      }
      return scope.tenantId;
    }
    if (requestedTenantId === null) {
      throw new BadRequestException("Selecciona la sede del lote.");
    }
    return requestedTenantId;
  }

  private assertLimits(uploads: BufferedAlimentacionFormatoPdfUpload[]) {
    if (uploads.length === 0) throw new BadRequestException("Debes adjuntar al menos un PDF.");
    if (uploads.length > BULK_IMPORT_MAX_FILES) {
      throw new BadRequestException("El lote admite maximo 100 archivos.");
    }
    const total = uploads.reduce((sum, upload) => sum + upload.sizeBytes, 0);
    if (total > BULK_IMPORT_MAX_TOTAL_BYTES) {
      throw new BadRequestException("El lote admite maximo 100 MiB.");
    }
  }

  private ensureCanImport(actor: Pick<AuthUser, "role" | "permissions">) {
    if (!canImportAlimentacion(actor)) {
      throw new ForbiddenException("No tienes permisos para importar formatos de alimentacion.");
    }
  }

  private getBulkRepository(): BulkImportRepository {
    return this.repository as BulkImportRepository;
  }
}

type BulkImportRepository = AlimentacionRepository & {
  createBulkImportBatch: NonNullable<AlimentacionRepository["createBulkImportBatch"]>;
  createBulkImportItems: NonNullable<AlimentacionRepository["createBulkImportItems"]>;
  findBulkImportBatch: NonNullable<AlimentacionRepository["findBulkImportBatch"]>;
  findBulkImportItems: NonNullable<AlimentacionRepository["findBulkImportItems"]>;
  updateBulkImportItem: NonNullable<AlimentacionRepository["updateBulkImportItem"]>;
  findAdultosByNormalizedDocumentNumbers: NonNullable<
    AlimentacionRepository["findAdultosByNormalizedDocumentNumbers"]
  >;
};

function normalize(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function summarize(items: AlimentacionBulkImportItemRecord[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === "ready").length,
    warnings: items.filter((item) => item.status === "warning").length,
    errors: items.filter((item) => item.status === "error").length,
    imported: items.filter((item) => item.status === "imported").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
}

function toContractItem(item: AlimentacionBulkImportItemRecord): AlimentacionBulkImportItem {
  return alimentacionBulkImportItemSchema.parse({
    itemId: item.id,
    originalName: item.originalName,
    status: item.status,
    reasonCode: item.reasonCode,
    reasonMessage: item.reasonMessage,
    documentNumber: item.documentNumber,
    deliveryMonth: item.deliveryMonth,
    adultoMayorId: item.adultoMayorId,
    adultoMayorFullName: item.adultoMayorFullName,
    existingVersion: item.existingVersion,
    importedVersion: item.importedVersion,
  });
}
