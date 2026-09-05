import { hash } from "argon2";
import {
  type AuthUser,
  type CreateEmpleadoRequest,
  type EmpleadoDetail,
  type EmpleadoListItem,
  type EmpleadoListQuery,
  type EmpleadoTenantOption,
  type UpdateEmpleadoRequest,
  empleadoDetailSchema,
  empleadoListItemSchema,
  empleadoTenantOptionSchema,
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
  canCreateEmpleados,
  canAssignEmpleadoRole,
  canManageEmpleados,
  resolveEmpleadoTenantForCreate,
  resolveEmpleadosScope,
} from "../domain/empleado.policy";
import { type EmpleadoAuditCommand, type EmpleadoRecord } from "../domain/empleado.types";
import {
  EMPLEADOS_REPOSITORY,
  type EmpleadosRepository,
} from "../domain/empleados.repository";

@Injectable()
export class EmpleadosService {
  constructor(
    @Inject(EMPLEADOS_REPOSITORY)
    private readonly empleadosRepository: EmpleadosRepository,
  ) {}

  async listEmpleados(query: EmpleadoListQuery, actor: AuthUser): Promise<EmpleadoListItem[]> {
    const scope = this.resolveScopeOrThrow(actor);
    const records = await this.empleadosRepository.findMany({
      search: query.search,
      scope,
    });

    return records.map((record) => this.toListItem(record));
  }

  async listTenantOptions(actor: AuthUser): Promise<EmpleadoTenantOption[]> {
    if (actor.role !== "super_admin") {
      return [];
    }

    const tenants = await this.empleadosRepository.findTenantOptions();

    return tenants.map((tenant) => empleadoTenantOptionSchema.parse(tenant));
  }

  async getEmpleado(empleadoId: string, actor: AuthUser): Promise<EmpleadoDetail> {
    const scope = this.resolveScopeOrThrow(actor);
    const record = await this.empleadosRepository.findById({ id: empleadoId, scope });

    if (record === null) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    return this.toDetail(record);
  }

  async createEmpleado(
    command: CreateEmpleadoRequest,
    actor: AuthUser,
  ): Promise<EmpleadoDetail> {
    this.ensureCanCreate(actor);
    this.ensureCanAssignRole(actor, command.role);

    const tenantId = resolveEmpleadoTenantForCreate(actor, command.role, command.tenantId);

    if (command.role !== "super_admin" && tenantId === null) {
      throw new BadRequestException("Selecciona el centro al que pertenece el usuario.");
    }

    await this.ensureEmailIsUnique({ email: command.email });
    await this.ensureDocumentIsUnique({
      tenantId,
      documentNumber: command.documentNumber,
    });

    try {
      const record = await this.empleadosRepository.create(
        {
          ...command,
          tenantId,
          passwordHash: await hash(command.password),
        },
        {
          actorUserId: actor.id,
          action: "empleados.created",
          targetTenantId: tenantId,
          summary: `Usuario creado: ${joinFullName(command)}`,
          metadata: {
            email: command.email,
            role: command.role,
            documentNumber: command.documentNumber,
            isActive: command.isActive,
          },
        },
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async updateEmpleado(
    empleadoId: string,
    command: UpdateEmpleadoRequest,
    actor: AuthUser,
  ): Promise<EmpleadoDetail> {
    this.ensureCanManage(actor);
    this.ensureCanAssignRole(actor, command.role);

    const scope = this.resolveScopeOrThrow(actor);
    const currentRecord = await this.empleadosRepository.findById({
      id: empleadoId,
      scope,
    });

    if (currentRecord === null) {
      throw new NotFoundException("Usuario no encontrado.");
    }

    if (currentRecord.tenantId === null && command.role !== "super_admin") {
      throw new BadRequestException("Un SuperAdmin global debe conservar el rol SuperAdmin.");
    }

    if (currentRecord.tenantId !== null && command.role === "super_admin") {
      throw new BadRequestException("No se puede convertir un usuario de centro en SuperAdmin.");
    }

    if (currentRecord.isTenantOwner && command.role !== "admin") {
      throw new BadRequestException("El propietario del centro debe conservar el rol Admin.");
    }

    if (currentRecord.tenantActiveSigner?.employeeId === currentRecord.id && command.role !== "director") {
      throw new BadRequestException(
        "No puedes cambiar el rol de un director que es el firmante activo del centro.",
      );
    }

    if (currentRecord.id === actor.id && !command.isActive) {
      throw new BadRequestException("No puedes inactivar tu propia cuenta.");
    }

    if (currentRecord.tenantActiveSigner?.employeeId === currentRecord.id && !command.isActive) {
      throw new BadRequestException(
        "No puedes inactivar un director que es el firmante activo del centro.",
      );
    }

    await this.ensureEmailIsUnique({ email: command.email, excludeId: empleadoId });
    await this.ensureDocumentIsUnique({
      tenantId: currentRecord.tenantId,
      documentNumber: command.documentNumber,
      excludeId: empleadoId,
    });

    try {
      const passwordHash =
        command.password === undefined ? undefined : await hash(command.password);
      const updateCommand = {
        ...command,
        id: empleadoId,
        ...(passwordHash === undefined ? {} : { passwordHash }),
      };
      const record = await this.empleadosRepository.update(
        updateCommand,
        this.buildUpdateAuditEntries({
          actor,
          before: currentRecord,
          after: command,
          passwordWasReset: passwordHash !== undefined,
        }),
      );

      return this.toDetail(record);
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  private resolveScopeOrThrow(actor: AuthUser) {
    const scope = resolveEmpleadosScope(actor);

    if (scope === null) {
      throw new ForbiddenException("No tienes permisos para gestionar empleados.");
    }

    return scope;
  }

  private ensureCanManage(actor: AuthUser) {
    if (!canManageEmpleados(actor)) {
      throw new ForbiddenException("No tienes permisos para gestionar empleados.");
    }
  }

  private ensureCanCreate(actor: AuthUser) {
    if (!canCreateEmpleados(actor)) {
      throw new ForbiddenException("No tienes permisos para crear usuarios.");
    }
  }

  private ensureCanAssignRole(actor: AuthUser, role: AuthUser["role"]) {
    if (!canAssignEmpleadoRole(actor, role)) {
      throw new ForbiddenException("No puedes asignar ese tipo de usuario.");
    }
  }

  private async ensureEmailIsUnique(query: { email: string; excludeId?: string }) {
    const existingRecord = await this.empleadosRepository.findByEmail(query);

    if (existingRecord !== null) {
      throw new ConflictException("Ya existe un usuario con ese correo.");
    }
  }

  private async ensureDocumentIsUnique(query: {
    tenantId: string | null;
    documentNumber: string;
    excludeId?: string;
  }) {
    const existingRecord = await this.empleadosRepository.findByDocument(query);

    if (existingRecord !== null) {
      throw new ConflictException("Ya existe un usuario con ese documento en este centro.");
    }
  }

  private buildUpdateAuditEntries(command: {
    actor: AuthUser;
    before: EmpleadoRecord;
    after: UpdateEmpleadoRequest;
    passwordWasReset: boolean;
  }) {
    const entries: EmpleadoAuditCommand[] = [
      {
        actorUserId: command.actor.id,
        action: "empleados.updated" as const,
        targetTenantId: command.before.tenantId,
        summary: `Usuario actualizado: ${joinFullName(command.after)}`,
        metadata: {
          before: this.toAuditSnapshot(command.before),
          after: {
            email: command.after.email,
            fullName: joinFullName(command.after),
            role: command.after.role,
            documentNumber: command.after.documentNumber,
            phone: command.after.phone,
            isActive: command.after.isActive,
          },
        },
      },
    ];

    if (command.before.isActive !== command.after.isActive) {
      entries.push({
        actorUserId: command.actor.id,
        action: command.after.isActive ? "empleados.activated" : "empleados.deactivated",
        targetTenantId: command.before.tenantId,
        summary: `Usuario ${command.after.isActive ? "activado" : "inactivado"}: ${
          command.after.email
        }`,
        metadata: {
          previousIsActive: command.before.isActive,
          nextIsActive: command.after.isActive,
        },
      });
    }

    if (command.passwordWasReset) {
      entries.push({
        actorUserId: command.actor.id,
        action: "empleados.password_reset" as const,
        targetTenantId: command.before.tenantId,
        summary: `Clave de usuario reiniciada: ${command.after.email}`,
        metadata: {
          userId: command.before.id,
          email: command.after.email,
        },
      });
    }

    return entries;
  }

  private toListItem(record: EmpleadoRecord): EmpleadoListItem {
    return empleadoListItemSchema.parse({
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      documentNumber: record.documentNumber,
      fullName: record.fullName,
      email: record.email,
      phone: record.phone,
      role: record.role,
      isActive: record.isActive,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    });
  }

  private toDetail(record: EmpleadoRecord): EmpleadoDetail {
    const nameParts = resolveNameParts(record);

    return empleadoDetailSchema.parse({
      ...this.toListItem(record),
      firstName: nameParts.firstName,
      middleName: nameParts.middleName,
      firstSurname: nameParts.firstSurname,
      secondSurname: nameParts.secondSurname,
      latestSignature:
        record.latestSignature === null
          ? null
          : {
              id: record.latestSignature.id,
              originalName: record.latestSignature.originalName,
              mimeType: record.latestSignature.mimeType,
              sizeBytes: record.latestSignature.sizeBytes,
              createdAt: record.latestSignature.createdAt.toISOString(),
            },
      tenantActiveSigner:
        record.tenantActiveSigner === null
          ? null
          : {
              tenantId: record.tenantActiveSigner.tenantId,
              employeeId: record.tenantActiveSigner.employeeId,
              signatureVersionId: record.tenantActiveSigner.signatureVersionId,
              activatedByUserId: record.tenantActiveSigner.activatedByUserId,
              activatedAt: record.tenantActiveSigner.activatedAt.toISOString(),
              updatedAt: record.tenantActiveSigner.updatedAt.toISOString(),
            },
      currentDirectorSignatureAssignment:
        record.currentDirectorSignatureAssignment === null
          ? null
          : {
              id: record.currentDirectorSignatureAssignment.id,
              tenantId: record.currentDirectorSignatureAssignment.tenantId,
              employeeId: record.currentDirectorSignatureAssignment.employeeId,
              signatureVersionId: record.currentDirectorSignatureAssignment.signatureVersionId,
              effectiveFrom: record.currentDirectorSignatureAssignment.effectiveFrom,
              effectiveTo: record.currentDirectorSignatureAssignment.effectiveTo,
            },
      directorSignatureAssignmentHistory: record.directorSignatureAssignmentHistory.map(
        (assignment) => ({
          id: assignment.id,
          tenantId: assignment.tenantId,
          employeeId: assignment.employeeId,
          employeeFullName: assignment.employeeFullName,
          signatureVersionId: assignment.signatureVersionId,
          signatureOriginalName: assignment.signatureOriginalName,
          effectiveFrom: assignment.effectiveFrom,
          effectiveTo: assignment.effectiveTo,
          createdAt: assignment.createdAt.toISOString(),
        }),
      ),
    });
  }

  private toAuditSnapshot(record: EmpleadoRecord): Record<string, unknown> {
    return {
      id: record.id,
      tenantId: record.tenantId,
      email: record.email,
      fullName: record.fullName,
      role: record.role,
      documentNumber: record.documentNumber,
      phone: record.phone,
      isActive: record.isActive,
      isTenantOwner: record.isTenantOwner,
    };
  }

  private throwConflictForUniqueViolation(error: unknown): never | void {
    if (!isPostgresUniqueViolation(error)) {
      return;
    }

    const constraintName = error.constraint_name ?? error.constraint ?? "";

    if (constraintName === "users_email_unique") {
      throw new ConflictException("Ya existe un usuario con ese correo.");
    }

    if (
      constraintName === "users_tenant_document_unique" ||
      constraintName === "users_global_document_unique"
    ) {
      throw new ConflictException("Ya existe un usuario con ese documento en este centro.");
    }

    throw new ConflictException("La operacion entra en conflicto con datos existentes.");
  }
}

function joinFullName(command: {
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
}): string {
  return [
    command.firstName,
    command.middleName,
    command.firstSurname,
    command.secondSurname,
  ]
    .filter((namePart): namePart is string => namePart !== null && namePart.trim() !== "")
    .join(" ");
}

function resolveNameParts(record: EmpleadoRecord) {
  if (record.firstName !== null && record.firstSurname !== null) {
    return {
      firstName: record.firstName,
      middleName: record.middleName,
      firstSurname: record.firstSurname,
      secondSurname: record.secondSurname,
    };
  }

  const parts = record.fullName.trim().split(/\s+/);
  const [firstName = record.fullName, ...rest] = parts;
  const middleName = rest.length > 2 ? rest.slice(0, -2).join(" ") : null;
  const firstSurname =
    rest.length === 0
      ? "Sin apellido"
      : rest.length === 1
        ? rest[0]
        : rest[rest.length - 2];
  const secondSurname = rest.length > 1 ? rest.at(-1) ?? null : null;

  return {
    firstName,
    middleName,
    firstSurname: firstSurname ?? "Sin apellido",
    secondSurname,
  };
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
