import { createHash } from "node:crypto";
import path from "node:path";

import {
  type AssignEmpleadoDirectorSignatureRequest,
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

import { canManageEmpleados, resolveEmpleadosScope } from "../domain/empleado.policy";
import {
  type BufferedEmpleadoSignatureUpload,
  type DirectorSignatureMonthResolutionRecord,
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
} from "../domain/empleado.types";
import {
  EMPLEADOS_SIGNATURE_FILES_STORAGE,
  type EmpleadosSignatureFilesStorage,
} from "../domain/empleados-signature-files.storage";
import {
  EMPLEADOS_REPOSITORY,
  type EmpleadosRepository,
} from "../domain/empleados.repository";

const MAX_SIGNATURE_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ALLOWED_SIGNATURE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

@Injectable()
export class EmpleadosSignatureService {
  constructor(
    @Inject(EMPLEADOS_REPOSITORY)
    private readonly empleadosRepository: EmpleadosRepository,
    @Inject(EMPLEADOS_SIGNATURE_FILES_STORAGE)
    private readonly signatureFilesStorage: EmpleadosSignatureFilesStorage,
  ) {}

  async uploadSignature(
    empleadoId: string,
    file: BufferedEmpleadoSignatureUpload,
    actor: AuthUser,
  ): Promise<EmpleadoSignatureVersionRecord> {
    this.ensureCanManage(actor);

    const empleado = await this.getScopedEmpleadoOrThrow(empleadoId, actor);
    const tenantId = this.assertDirectorEmpleado(empleado);

    this.validateUpload(file);

    const storedFile = await this.signatureFilesStorage.saveFile(
      { tenantId, employeeId: empleado.id },
      file,
    );

    return await this.empleadosRepository.createSignatureVersion(
      {
        employeeId: empleado.id,
        tenantId,
        originalName: storedFile.originalName,
        mimeType: storedFile.mimeType,
        sizeBytes: storedFile.sizeBytes,
        checksum: createHash("sha256").update(file.buffer).digest("hex"),
        relativePath: storedFile.relativePath,
        uploadedByUserId: actor.id,
      },
      {
        actorUserId: actor.id,
        action: "empleados.signature_uploaded",
        targetTenantId: tenantId,
        summary: `Firma cargada para director: ${empleado.fullName}`,
        metadata: {
          employeeId: empleado.id,
          originalName: storedFile.originalName,
          mimeType: storedFile.mimeType,
          sizeBytes: storedFile.sizeBytes,
        },
      },
    );
  }

  async assignDirectorSignature(
    empleadoId: string,
    command: AssignEmpleadoDirectorSignatureRequest,
    actor: AuthUser,
  ) {
    this.ensureCanManage(actor);

    const empleado = await this.getScopedEmpleadoOrThrow(empleadoId, actor);
    const tenantId = this.assertDirectorEmpleado(empleado);

    if (!empleado.isActive) {
      throw new BadRequestException(
        "Solo puedes asignar como firmante vigente a un director activo.",
      );
    }

    const signatureVersionId = command.signatureVersionId ?? empleado.latestSignature?.id ?? null;

    if (signatureVersionId === null) {
      throw new BadRequestException(
        "El director debe tener una firma cargada antes de asignarlo como firmante vigente.",
      );
    }

    const signatureVersion = await this.empleadosRepository.findSignatureVersionById({
      employeeId: empleado.id,
      signatureVersionId,
    });

    if (signatureVersion === null) {
      throw new BadRequestException("Selecciona una firma valida del director.");
    }

    const latestAssignment =
      await this.empleadosRepository.findLatestDirectorSignatureAssignmentByTenantId(tenantId);

    this.assertAssignmentDateIsValid(command.effectiveFrom, latestAssignment);

    const auditEntries: EmpleadoAuditCommand[] =
      latestAssignment === null
        ? []
        : [
            {
              actorUserId: actor.id,
              action: "empleados.director_signature_assignment_closed" as const,
              targetTenantId: tenantId,
              summary: "Vigencia de firma del director cerrada.",
              metadata: {
                tenantId,
                employeeId: latestAssignment.employeeId,
                signatureVersionId: latestAssignment.signatureVersionId,
                assignmentId: latestAssignment.id,
                effectiveFrom: latestAssignment.effectiveFrom,
                effectiveTo: resolvePreviousDate(command.effectiveFrom),
              },
            },
          ];

    auditEntries.push({
      actorUserId: actor.id,
      action: "empleados.director_signature_assigned",
      targetTenantId: tenantId,
      summary: `Director firmante asignado: ${empleado.fullName}`,
      metadata: {
        tenantId,
        employeeId: empleado.id,
        signatureVersionId: signatureVersion.id,
        effectiveFrom: command.effectiveFrom,
      },
    });

    return await this.empleadosRepository.assignDirectorSignature(
      {
        tenantId,
        employeeId: empleado.id,
        signatureVersionId: signatureVersion.id,
        effectiveFrom: command.effectiveFrom,
        createdByUserId: actor.id,
      },
      auditEntries,
    );
  }

  async downloadLatestSignatureFile(empleadoId: string, actor: AuthUser) {
    const empleado = await this.getScopedEmpleadoOrThrow(empleadoId, actor);

    if (empleado.latestSignature === null) {
      throw new NotFoundException("El director no tiene una firma cargada.");
    }

    return await this.signatureFilesStorage.readFile(
      empleado.latestSignature.relativePath,
      empleado.latestSignature.originalName,
      empleado.latestSignature.mimeType,
    );
  }

  async resolveDirectorSignatureForMonth(
    tenantId: string,
    deliveryMonth: string,
  ): Promise<DirectorSignatureMonthResolutionRecord> {
    const matches = await this.empleadosRepository.resolveDirectorSignatureForMonth({
      tenantId,
      deliveryMonth,
    });

    if (matches.length === 0) {
      throw new BadRequestException(
        "El centro no tiene un director firmante configurado para el periodo seleccionado.",
      );
    }

    if (matches.length > 1) {
      throw new ConflictException(
        "El centro tiene mas de un director firmante vigente para este periodo. Revisa la configuracion de firmas antes de exportar el formato.",
      );
    }

    return matches[0]!;
  }

  async readSignatureFile(signature: {
    relativePath: string;
    originalName: string;
    mimeType: string;
  }) {
    return await this.signatureFilesStorage.readFile(
      signature.relativePath,
      signature.originalName,
      signature.mimeType,
    );
  }

  private async getScopedEmpleadoOrThrow(empleadoId: string, actor: AuthUser) {
    const scope = resolveEmpleadosScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes permisos para gestionar empleados.");
    }

    const empleado = await this.empleadosRepository.findById({ id: empleadoId, scope });

    if (empleado === null) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    return empleado;
  }

  private ensureCanManage(actor: AuthUser) {
    if (!canManageEmpleados(actor)) {
      throw new ForbiddenException("No tienes permisos para gestionar empleados.");
    }
  }

  private assertDirectorEmpleado(empleado: EmpleadoRecord): string {
    if (empleado.tenantId === null) {
      throw new BadRequestException("Solo los directores de centro pueden tener firma configurada.");
    }

    if (empleado.role !== "director") {
      throw new BadRequestException("Solo puedes cargar firma para usuarios con rol Director.");
    }

    return empleado.tenantId;
  }

  private validateUpload(file: BufferedEmpleadoSignatureUpload) {
    if (file.sizeBytes <= 0 || file.buffer.byteLength === 0) {
      throw new BadRequestException("La firma no puede estar vacia.");
    }

    if (!ALLOWED_SIGNATURE_MIME_TYPES.has(file.mimeType)) {
      throw new BadRequestException("Adjunta la firma en formato PNG, JPG, JPEG o WEBP.");
    }

    if (file.sizeBytes > MAX_SIGNATURE_FILE_SIZE_BYTES) {
      throw new BadRequestException("La firma debe pesar maximo 3 MB.");
    }

    const extension = path.extname(file.originalName).trim().toLowerCase();

    if (extension !== "" && !isConsistentExtension(extension, file.mimeType)) {
      throw new BadRequestException(
        "La extension del archivo no coincide con el formato real de la firma.",
      );
    }
  }

  private assertAssignmentDateIsValid(
    effectiveFrom: string,
    latestAssignment: {
      effectiveFrom: string;
      effectiveTo: string | null;
    } | null,
  ) {
    if (latestAssignment === null) {
      return;
    }

    const lastCoveredDate = latestAssignment.effectiveTo ?? latestAssignment.effectiveFrom;

    if (effectiveFrom <= lastCoveredDate) {
      throw new BadRequestException(
        "La nueva vigencia debe iniciar despues de la ultima vigencia configurada del centro.",
      );
    }
  }
}

function isConsistentExtension(extension: string, mimeType: string): boolean {
  switch (mimeType) {
    case "image/png":
      return extension === ".png";
    case "image/jpeg":
    case "image/jpg":
      return extension === ".jpg" || extension === ".jpeg";
    case "image/webp":
      return extension === ".webp";
    default:
      return false;
  }
}

function resolvePreviousDate(dateValue: string): string {
  const currentDate = new Date(`${dateValue}T00:00:00.000Z`);
  currentDate.setUTCDate(currentDate.getUTCDate() - 1);

  return currentDate.toISOString().slice(0, 10);
}
