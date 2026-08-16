import { createHash } from "node:crypto";
import path from "node:path";

import {
  type AuthUser,
  type SetTenantActiveSignerRequest,
} from "@cuidarte/contracts";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { canManageEmpleados, resolveEmpleadosScope } from "../domain/empleado.policy";
import {
  type BufferedEmpleadoSignatureUpload,
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type EmpleadoSignatureVersionRecord,
  type TenantActiveSignerRecord,
  type TenantActiveSignerResolutionRecord,
} from "../domain/empleado.types";
import {
  EMPLEADOS_SIGNATURE_FILES_STORAGE,
  EmpleadoSignatureStoredFileNotFoundError,
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
    const tenantId = this.assertSignatureEligibleEmpleado(empleado);

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
        summary: `Firma cargada para usuario: ${empleado.fullName}`,
        metadata: {
          employeeId: empleado.id,
          employeeRole: empleado.role,
          originalName: storedFile.originalName,
          mimeType: storedFile.mimeType,
          sizeBytes: storedFile.sizeBytes,
        },
      },
    );
  }

  async setTenantActiveSigner(
    tenantId: string,
    command: SetTenantActiveSignerRequest,
    actor: AuthUser,
  ): Promise<TenantActiveSignerRecord> {
    this.ensureCanManage(actor);

    const empleado = await this.getScopedEmpleadoOrThrow(command.employeeId, actor);
    const scopedTenantId = this.assertDirectorSignerEmpleado(empleado);

    if (scopedTenantId !== tenantId) {
      throw new BadRequestException("El director seleccionado no pertenece a ese centro.");
    }

    if (!empleado.isActive) {
      throw new BadRequestException(
        "Solo puedes activar como firmante a un director activo.",
      );
    }

    if (empleado.latestSignature === null) {
      throw new BadRequestException("El director seleccionado no tiene una firma cargada.");
    }

    const signatureVersion = await this.empleadosRepository.findSignatureVersionById({
      employeeId: empleado.id,
      signatureVersionId: command.signatureVersionId,
    });

    if (signatureVersion === null) {
      throw new BadRequestException("La firma seleccionada no corresponde al director elegido.");
    }

    const audit: EmpleadoAuditCommand = {
      actorUserId: actor.id,
      action: "empleados.active_signer_updated",
      targetTenantId: tenantId,
      summary: `Firmante activo actualizado: ${empleado.fullName}`,
      metadata: {
        tenantId,
        employeeId: empleado.id,
        signatureVersionId: signatureVersion.id,
      },
    };

    return await this.empleadosRepository.setTenantActiveSigner(
      {
        tenantId,
        employeeId: empleado.id,
        signatureVersionId: signatureVersion.id,
        activatedByUserId: actor.id,
      },
      audit,
    );
  }

  async clearTenantActiveSigner(
    tenantId: string,
    actor: AuthUser,
  ): Promise<TenantActiveSignerRecord | null> {
    this.ensureCanManage(actor);
    this.ensureCanManageTenant(actor, tenantId);

    const audit: EmpleadoAuditCommand = {
      actorUserId: actor.id,
      action: "empleados.active_signer_cleared",
      targetTenantId: tenantId,
      summary: "Firmante activo desactivado.",
      metadata: { tenantId },
    };

    return await this.empleadosRepository.clearTenantActiveSigner(
      {
        tenantId,
        deactivatedByUserId: actor.id,
      },
      audit,
    );
  }

  async downloadLatestSignatureFile(empleadoId: string, actor: AuthUser) {
    const empleado = await this.getScopedEmpleadoOrThrow(empleadoId, actor);

    if (empleado.latestSignature === null) {
      throw new NotFoundException("El usuario no tiene una firma cargada.");
    }

    try {
      return await this.signatureFilesStorage.readFile(
        empleado.latestSignature.relativePath,
        empleado.latestSignature.originalName,
        empleado.latestSignature.mimeType,
      );
    } catch (error) {
      if (error instanceof EmpleadoSignatureStoredFileNotFoundError) {
        throw new NotFoundException("No fue posible encontrar el archivo de firma cargado.");
      }

      throw error;
    }
  }

  async findTenantActiveSignerByTenantId(
    tenantId: string,
  ): Promise<TenantActiveSignerRecord | null> {
    return await this.empleadosRepository.findTenantActiveSignerByTenantId(tenantId);
  }

  async resolveTenantActiveDirectorSignature(
    tenantId: string,
  ): Promise<TenantActiveSignerResolutionRecord> {
    const activeSigner =
      await this.empleadosRepository.resolveTenantActiveDirectorSignatureByTenantId(tenantId);

    if (activeSigner === null) {
      throw new BadRequestException("El centro no tiene un firmante activo configurado.");
    }

    return activeSigner;
  }

  async readSignatureFile(signature: {
    relativePath: string;
    originalName: string;
    mimeType: string;
  }) {
    try {
      return await this.signatureFilesStorage.readFile(
        signature.relativePath,
        signature.originalName,
        signature.mimeType,
      );
    } catch (error) {
      if (error instanceof EmpleadoSignatureStoredFileNotFoundError) {
        throw new NotFoundException("No fue posible encontrar el archivo de firma cargado.");
      }

      throw error;
    }
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

  private ensureCanManageTenant(actor: AuthUser, tenantId: string) {
    const scope = resolveEmpleadosScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes permisos para gestionar empleados.");
    }

    if (scope.type === "tenant" && scope.tenantId !== tenantId) {
      throw new ForbiddenException("No tienes permisos para gestionar este centro.");
    }
  }

  private assertSignatureEligibleEmpleado(empleado: EmpleadoRecord): string {
    if (empleado.tenantId === null) {
      throw new BadRequestException("Solo los usuarios de centro pueden tener firma configurada.");
    }

    return empleado.tenantId;
  }

  private assertDirectorSignerEmpleado(empleado: EmpleadoRecord): string {
    const tenantId = this.assertSignatureEligibleEmpleado(empleado);

    if (empleado.role !== "director") {
      throw new BadRequestException("Solo los usuarios con rol Director pueden ser firmantes activos.");
    }

    return tenantId;
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
