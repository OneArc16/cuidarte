import { createHash } from "crypto";

import {
  type AdultoMayorImportConfirmResponse,
  type AdultoMayorImportDetail,
  adultoMayorImportConfirmResponseSchema,
  adultoMayorImportDetailSchema,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import ExcelJS from "exceljs";

import { type AuthUser } from "@cuidarte/contracts";

import {
  AdultosMayoresImportParser,
  AdultoMayorImportParseError,
} from "../domain/adultos-mayores-import-parser";
import {
  canImportAdultosMayores,
  resolveAdultoMayorImportTenantForValidate,
} from "../domain/adulto-mayor-import.policy";
import {
  ADULTOS_MAYORES_IMPORT_REPOSITORY,
  AdultoMayorImportCommitConflictError,
  type AdultosMayoresImportRepository,
} from "../domain/adultos-mayores-import.repository";
import { AdultosMayoresImportValidator } from "../domain/adultos-mayores-import-validator";
import { type AdultoMayorImportBatchRecord } from "../domain/adulto-mayor-import.types";
import { AdultosMayoresImportTemplateService } from "./adultos-mayores-import-template.service";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const TEMPLATE_KEY = "adultos-mayores-import";
const TEMPLATE_VERSION = 2;

export type BufferedAdultoMayorImportUpload = {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

@Injectable()
export class AdultosMayoresImportService {
  constructor(
    @Inject(ADULTOS_MAYORES_IMPORT_REPOSITORY)
    private readonly importRepository: AdultosMayoresImportRepository,
    private readonly templateService: AdultosMayoresImportTemplateService,
    private readonly parser: AdultosMayoresImportParser,
    private readonly validator: AdultosMayoresImportValidator,
  ) {}

  async downloadTemplate(actor: AuthUser) {
    this.ensureCanImport(actor);
    return await this.templateService.generateTemplate();
  }

  async validateImport(
    upload: BufferedAdultoMayorImportUpload,
    actor: AuthUser,
    requestedTenantId: string | null,
  ): Promise<AdultoMayorImportDetail> {
    this.ensureCanImport(actor);
    const tenantId = this.resolveTenantForValidate(actor, requestedTenantId);
    const tenant = await this.requireTenant(tenantId);
    this.ensureUploadWithinLimits(upload);
    const checksum = this.computeChecksum(upload.buffer);
    const parsed = await this.parseWorkbook(upload);
    const catalogs = await this.importRepository.loadCatalogMaps();
    const normalizedDocuments = parsed.rows.map((row) => ({
      documentType: row.values.tipo_documento ?? "",
      documentNumber: row.values.numero_documento ?? "",
    }));
    const existingAdults = await this.importRepository.findExistingAdultsByTenantAndDocuments({
      tenantId,
      documents: normalizedDocuments,
    });
    const validation = this.validator.validateRows(parsed.rows, catalogs, existingAdults);
    const now = new Date();
    const batch = await this.importRepository.createValidatedBatch({
      batch: {
        tenantId,
        requestedByUserId: actor.id,
        originalFilename: this.sanitizeFilename(upload.originalName),
        fileChecksumSha256: checksum,
        templateVersion: parsed.templateVersion,
        status: validation.summary.invalidRows > 0 ? "validated_with_errors" : "ready",
        summary: validation.summary,
        issues: validation.issues,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
      rows: validation.rows.map((row) => ({
        rowNumber: row.rowNumber,
        status: row.status,
        normalizedPayload: row.normalizedPayload,
        issues: row.issues,
        existingAdultoId: row.existingAdultoId,
        existingAdultoUpdatedAt: row.existingAdultoUpdatedAt,
      })),
    });

    await this.importRepository.recordAudit({
      actorUserId: actor.id,
      action: "adultos-mayores.import.validated",
      targetTenantId: tenantId,
      summary: `Importacion validada para ${tenant.name}`,
      metadata: {
        importId: batch.id,
        checksum,
        templateVersion: parsed.templateVersion,
        totalRows: batch.summary.totalRows,
        readyRows: batch.summary.readyRows,
        updateRows: batch.summary.updateRows,
        invalidRows: batch.summary.invalidRows,
        unchangedRows: batch.summary.unchangedRows,
        existingRows: batch.summary.existingRows,
      },
    });

    return this.toDetailResponse(batch);
  }

  async getImport(importId: string, actor: AuthUser): Promise<AdultoMayorImportDetail> {
    this.ensureCanImport(actor);
    const batch = await this.findVisibleImport(importId, actor);

    if (batch === null) {
      throw new NotFoundException("Lote de importacion no encontrado.");
    }

    return this.toDetailResponse(batch);
  }

  async confirmImport(
    importId: string,
    actor: AuthUser,
  ): Promise<AdultoMayorImportConfirmResponse> {
    this.ensureCanImport(actor);
    const batch = await this.findVisibleImport(importId, actor);

    if (batch === null) {
      throw new NotFoundException("Lote de importacion no encontrado.");
    }

    if (batch.requestedByUserId !== actor.id) {
      throw new ForbiddenException("Solo el usuario que valido el lote puede confirmarlo.");
    }

    if (batch.status === "completed") {
      return adultoMayorImportConfirmResponseSchema.parse({
        importId: batch.id,
        status: "completed",
        createdRows: batch.summary.createdRows,
        updatedRows: batch.summary.updatedRows,
        unchangedRows: batch.summary.unchangedRows,
        existingRows: batch.summary.existingRows,
        completedAt: batch.confirmedAt ?? batch.updatedAt,
      });
    }

    if (batch.status !== "ready") {
      throw new ConflictException("El lote no se encuentra listo para confirmar.");
    }

    if (batch.expiresAt.getTime() < Date.now()) {
      throw new ConflictException("El lote expiro. Valida nuevamente el archivo.");
    }

    const lockedBatch = await this.importRepository.lockBatchForConfirmation({
      importId,
      requestedByUserId: actor.id,
    });

    if (lockedBatch === null) {
      const currentBatch = await this.findVisibleImport(importId, actor);

      if (currentBatch?.status === "completed") {
        return adultoMayorImportConfirmResponseSchema.parse({
          importId: currentBatch.id,
          status: "completed",
          createdRows: currentBatch.summary.createdRows,
          updatedRows: currentBatch.summary.updatedRows,
          unchangedRows: currentBatch.summary.unchangedRows,
          existingRows: currentBatch.summary.existingRows,
          completedAt: currentBatch.confirmedAt ?? currentBatch.updatedAt,
        });
      }

      throw new ConflictException("El lote no se encuentra listo para confirmar.");
    }

    try {
      const result = await this.importRepository.commitValidatedBatch({
        importId,
        actorUserId: actor.id,
      });

      return adultoMayorImportConfirmResponseSchema.parse({
        importId,
        status: "completed",
        createdRows: result.createdRows,
        updatedRows: result.updatedRows,
        unchangedRows: result.unchangedRows,
        existingRows: result.existingRows,
        completedAt: result.confirmedAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof AdultoMayorImportCommitConflictError) {
        await this.importRepository.markImportAsFailed({
          importId,
          failureCode: "concurrency_conflict",
        });

        throw new ConflictException(
          "Se detectaron cambios recientes en los registros. Vuelve a validar el archivo antes de confirmar.",
        );
      }

      await this.importRepository.markImportAsFailed({
        importId,
        failureCode: "confirmation_failed",
      });

      throw error;
    }
  }

  async downloadIssuesWorkbook(importId: string, actor: AuthUser) {
    const batch = await this.findVisibleImport(importId, actor);

    if (batch === null) {
      throw new NotFoundException("Lote de importacion no encontrado.");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Errores");

    worksheet.columns = [
      { header: "fila_excel", key: "rowNumber", width: 12 },
      { header: "columna", key: "column", width: 28 },
      { header: "severidad", key: "severity", width: 12 },
      { header: "codigo", key: "code", width: 24 },
      { header: "mensaje", key: "message", width: 60 },
      { header: "valor_recibido", key: "receivedValue", width: 40 },
    ];
    worksheet.getRow(1).font = { bold: true };

    for (const issue of batch.issues) {
      worksheet.addRow({
        rowNumber: issue.rowNumber,
        column: issue.column,
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        receivedValue: issue.receivedValue ?? "",
      });
    }

    return {
      buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      filename: `errores-importacion-adultos-mayores-${importId}.xlsx`,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  private async findVisibleImport(
    importId: string,
    actor: AuthUser,
  ): Promise<AdultoMayorImportBatchRecord | null> {
    const batch = await this.importRepository.findImportBatchById(
      actor.role === "super_admin"
        ? { importId }
        : actor.tenantId === null
          ? { importId }
          : { importId, tenantId: actor.tenantId },
    );

    if (batch === null) {
      return null;
    }

    if (actor.role !== "super_admin" && actor.tenantId !== batch.tenant.id) {
      return null;
    }
    return batch;
  }

  private async parseWorkbook(upload: BufferedAdultoMayorImportUpload) {
    try {
      const parsed = await this.parser.parse(upload.buffer);

      if (parsed.templateKey !== TEMPLATE_KEY || parsed.templateVersion !== TEMPLATE_VERSION) {
        throw new BadRequestException("La plantilla no corresponde a una version soportada.");
      }

      return parsed;
    } catch (error) {
      if (error instanceof AdultoMayorImportParseError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private resolveTenantForValidate(actor: AuthUser, requestedTenantId: string | null): string {
    const tenantId = resolveAdultoMayorImportTenantForValidate(actor, requestedTenantId);

    if (actor.role !== "super_admin" && requestedTenantId !== null) {
      throw new ForbiddenException("No puedes enviar un centro distinto al de tu sesion.");
    }

    if (actor.role === "super_admin" && tenantId === null) {
      throw new BadRequestException(
        "Selecciona el centro donde se importaran los adultos mayores.",
      );
    }

    if (actor.role !== "super_admin" && tenantId === null) {
      throw new ForbiddenException("Tu usuario no tiene un centro asociado.");
    }

    return tenantId as string;
  }

  private async requireTenant(tenantId: string) {
    const tenant = await this.importRepository.findTenantById(tenantId);

    if (tenant === null || !tenant.isActive) {
      throw new BadRequestException("El centro seleccionado no existe o no se encuentra activo.");
    }

    return tenant;
  }

  private ensureCanImport(actor: Pick<AuthUser, "role">) {
    if (!canImportAdultosMayores(actor)) {
      throw new ForbiddenException(
        "Solo Director, Admin y SuperAdmin pueden importar adultos mayores.",
      );
    }
  }

  private ensureUploadWithinLimits(upload: BufferedAdultoMayorImportUpload) {
    if (upload.sizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("El archivo supera el limite de 10 MiB.");
    }
  }

  private computeChecksum(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
  }

  private toDetailResponse(batch: AdultoMayorImportBatchRecord): AdultoMayorImportDetail {
    return adultoMayorImportDetailSchema.parse({
      importId: batch.id,
      status: batch.status,
      tenant: batch.tenant,
      requestedByUserId: batch.requestedByUserId,
      originalFilename: batch.originalFilename,
      fileChecksumSha256: batch.fileChecksumSha256,
      templateVersion: batch.templateVersion,
      summary: batch.summary,
      issues: batch.issues,
      rows: batch.rows,
      canConfirm: batch.canConfirm && batch.expiresAt.getTime() > Date.now(),
      expiresAt: batch.expiresAt.toISOString(),
      confirmedAt: batch.confirmedAt === null ? null : batch.confirmedAt.toISOString(),
      failureCode: batch.failureCode,
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
    });
  }

  private sanitizeFilename(filename: string): string {
    const cleaned = filename.replace(/[\r\n"\\]/g, "_").trim();
    return cleaned === "" ? "importacion-adultos-mayores.xlsx" : cleaned.slice(0, 260);
  }
}
