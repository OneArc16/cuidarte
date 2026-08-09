import { hash } from "argon2";
import {
  type AuthUser,
  type BackofficeTenant,
  type BackofficeTenantDetail,
  type BackofficeTenantListItem,
  type BackofficeTenantOwner,
  type CreateBackofficeTenantRequest,
  type UpdateBackofficeTenantRequest,
  backofficeTenantOwnerSchema,
  backofficeTenantSchema,
} from "@cuidarte/contracts";
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { and, asc, eq, ilike, ne, or, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../database/database.service";
import { auditLogs, tenants, users } from "../../database/schema";
import { UbicacionesService } from "../ubicaciones/application/ubicaciones.service";

type TenantRow = typeof tenants.$inferSelect;
type UserRow = typeof users.$inferSelect;
type TenantCommand = CreateBackofficeTenantRequest["tenant"];
type OwnerCreateCommand = CreateBackofficeTenantRequest["owner"];
type OwnerUpdateCommand = UpdateBackofficeTenantRequest["owner"];

type TenantOwnerSelection = {
  tenant: TenantRow;
  ownerId: string | null;
  ownerTenantId: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
  ownerIsActive: boolean | null;
  ownerCreatedAt: Date | null;
  ownerUpdatedAt: Date | null;
};

type AuditEntry = typeof auditLogs.$inferInsert;
type BackofficeTenantCoreDetail = Omit<BackofficeTenantDetail, "logo" | "activeSigner">;

@Injectable()
export class BackofficeService {
  constructor(
    private readonly database: DatabaseService,
    private readonly ubicacionesService: UbicacionesService,
  ) {}

  async listTenants(query: { search: string | null; status: "all" | "active" | "inactive" }) {
    const rows = await this.database.db
      .select(this.getTenantOwnerSelection())
      .from(tenants)
      .leftJoin(users, and(eq(users.tenantId, tenants.id), eq(users.isTenantOwner, true)))
      .where(this.buildTenantListWhere(query))
      .orderBy(asc(tenants.name));

    return rows.map((row): BackofficeTenantListItem => ({
      tenant: this.toBackofficeTenant(row.tenant),
      owner: this.toBackofficeOwner(row),
    }));
  }

  async getTenantDetail(tenantId: string): Promise<BackofficeTenantCoreDetail> {
    return this.findTenantDetailOrThrow(tenantId);
  }

  async createTenant(
    command: CreateBackofficeTenantRequest,
    actor: AuthUser,
  ): Promise<BackofficeTenantCoreDetail> {
    const location = await this.ubicacionesService.resolveDepartmentMunicipalityPair(
      command.tenant.departmentId,
      command.tenant.municipalityId,
    );
    await this.ensureTenantIsUnique(command.tenant);
    await this.ensureOwnerEmailIsUnique(command.owner);

    try {
      return await this.database.db.transaction(async (tx) => {
        const now = new Date();
        const [tenant] = await tx
          .insert(tenants)
          .values({
            ...command.tenant,
            departmentId: location.department.id,
            municipalityId: location.municipality.id,
            department: location.department.name,
            city: location.municipality.name,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (tenant === undefined) {
          throw new InternalServerErrorException("No fue posible crear el tenant.");
        }

        const passwordHash = await hash(command.owner.password);
        const [owner] = await tx
          .insert(users)
          .values({
            tenantId: tenant.id,
            email: command.owner.email,
            fullName: command.owner.fullName,
            role: "admin",
            isTenantOwner: true,
            passwordHash,
            passwordSetByAdmin: true,
            isActive: command.owner.isActive,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        if (owner === undefined) {
          throw new InternalServerErrorException("No fue posible crear el propietario.");
        }

        await tx.insert(auditLogs).values({
          actorUserId: actor.id,
          action: "backoffice.tenant.created",
          targetTenantId: tenant.id,
          targetUserId: owner.id,
          summary: `Tenant creado: ${tenant.name}`,
          metadata: {
            tenant: this.toTenantAuditSnapshot(tenant),
            owner: this.toOwnerAuditSnapshot(owner),
          },
        });

        return {
          tenant: this.toBackofficeTenant(tenant),
          owner: this.toBackofficeOwnerFromUser(owner),
        };
      });
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  async updateTenant(
    tenantId: string,
    command: UpdateBackofficeTenantRequest,
    actor: AuthUser,
  ): Promise<BackofficeTenantCoreDetail> {
    const currentDetail = await this.findTenantDetailOrThrow(tenantId);
    const location = await this.ubicacionesService.resolveDepartmentMunicipalityPair(
      command.tenant.departmentId,
      command.tenant.municipalityId,
    );

    await this.ensureTenantIsUnique(command.tenant, tenantId);
    await this.ensureOwnerEmailIsUnique(command.owner, currentDetail.owner.id);

    try {
      return await this.database.db.transaction(async (tx) => {
        const now = new Date();
        const [updatedTenant] = await tx
          .update(tenants)
          .set({
            ...command.tenant,
            departmentId: location.department.id,
            municipalityId: location.municipality.id,
            department: location.department.name,
            city: location.municipality.name,
            updatedAt: now,
          })
          .where(eq(tenants.id, tenantId))
          .returning();

        if (updatedTenant === undefined) {
          throw new NotFoundException("Tenant no encontrado.");
        }

        const ownerUpdateValues: Partial<typeof users.$inferInsert> = {
          email: command.owner.email,
          fullName: command.owner.fullName,
          isActive: command.owner.isActive,
          updatedAt: now,
        };

        if (command.owner.password !== undefined) {
          ownerUpdateValues.passwordHash = await hash(command.owner.password);
          ownerUpdateValues.passwordSetByAdmin = true;
          ownerUpdateValues.passwordChangedAt = null;
          ownerUpdateValues.failedLoginAttempts = 0;
          ownerUpdateValues.lockedUntil = null;
        }

        const [updatedOwner] = await tx
          .update(users)
          .set(ownerUpdateValues)
          .where(eq(users.id, currentDetail.owner.id))
          .returning();

        if (updatedOwner === undefined) {
          throw new ConflictException("El tenant no tiene propietario configurado.");
        }

        await tx.insert(auditLogs).values(
          this.buildUpdateAuditEntries({
            actor,
            before: currentDetail,
            afterTenant: updatedTenant,
            afterOwner: updatedOwner,
            passwordWasReset: command.owner.password !== undefined,
          }),
        );

        return {
          tenant: this.toBackofficeTenant(updatedTenant),
          owner: this.toBackofficeOwnerFromUser(updatedOwner),
        };
      });
    } catch (error: unknown) {
      this.throwConflictForUniqueViolation(error);
      throw error;
    }
  }

  private async findTenantDetailOrThrow(tenantId: string): Promise<BackofficeTenantCoreDetail> {
    const [row] = await this.database.db
      .select(this.getTenantOwnerSelection())
      .from(tenants)
      .leftJoin(users, and(eq(users.tenantId, tenants.id), eq(users.isTenantOwner, true)))
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (row === undefined) {
      throw new NotFoundException("Tenant no encontrado.");
    }

    const owner = this.toBackofficeOwner(row);

    if (owner === null) {
      throw new ConflictException("El tenant no tiene propietario configurado.");
    }

    return {
      tenant: this.toBackofficeTenant(row.tenant),
      owner,
    };
  }

  private getTenantOwnerSelection() {
    return {
      tenant: tenants,
      ownerId: users.id,
      ownerTenantId: users.tenantId,
      ownerEmail: users.email,
      ownerFullName: users.fullName,
      ownerIsActive: users.isActive,
      ownerCreatedAt: users.createdAt,
      ownerUpdatedAt: users.updatedAt,
    };
  }

  private buildTenantListWhere(query: {
    search: string | null;
    status: "all" | "active" | "inactive";
  }): SQL | undefined {
    const conditions: SQL[] = [];

    if (query.status === "active") {
      conditions.push(eq(tenants.isActive, true));
    }

    if (query.status === "inactive") {
      conditions.push(eq(tenants.isActive, false));
    }

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;
      const searchCondition = or(
        ilike(tenants.name, searchPattern),
        ilike(tenants.documentNumber, searchPattern),
        ilike(tenants.email, searchPattern),
        ilike(tenants.city, searchPattern),
        ilike(tenants.department, searchPattern),
        ilike(users.fullName, searchPattern),
        ilike(users.email, searchPattern),
      );

      if (searchCondition !== undefined) {
        conditions.push(searchCondition);
      }
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private async ensureTenantIsUnique(command: TenantCommand, currentTenantId?: string) {
    if (command.documentNumber !== null) {
      const documentConditions = [
        eq(tenants.documentType, command.documentType),
        eq(tenants.documentNumber, command.documentNumber),
      ];

      if (currentTenantId !== undefined) {
        documentConditions.push(ne(tenants.id, currentTenantId));
      }

      const [existingDocumentTenant] = await this.database.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(...documentConditions))
        .limit(1);

      if (existingDocumentTenant !== undefined) {
        throw new ConflictException("Ya existe un tenant con ese documento.");
      }
    }

    if (command.email !== null) {
      const emailConditions = [eq(tenants.email, command.email)];

      if (currentTenantId !== undefined) {
        emailConditions.push(ne(tenants.id, currentTenantId));
      }

      const [existingEmailTenant] = await this.database.db
        .select({ id: tenants.id })
        .from(tenants)
        .where(and(...emailConditions))
        .limit(1);

      if (existingEmailTenant !== undefined) {
        throw new ConflictException("Ya existe un tenant con ese correo.");
      }
    }
  }

  private async ensureOwnerEmailIsUnique(command: OwnerCreateCommand | OwnerUpdateCommand, ownerId?: string) {
    const conditions = [eq(users.email, command.email)];

    if (ownerId !== undefined) {
      conditions.push(ne(users.id, ownerId));
    }

    const [existingOwner] = await this.database.db
      .select({ id: users.id })
      .from(users)
      .where(and(...conditions))
      .limit(1);

    if (existingOwner !== undefined) {
      throw new ConflictException("Ya existe un usuario con ese correo.");
    }
  }

  private buildUpdateAuditEntries(command: {
    actor: AuthUser;
    before: BackofficeTenantCoreDetail;
    afterTenant: TenantRow;
    afterOwner: UserRow;
    passwordWasReset: boolean;
  }): AuditEntry[] {
    const entries: AuditEntry[] = [
      {
        actorUserId: command.actor.id,
        action: "backoffice.tenant.updated",
        targetTenantId: command.afterTenant.id,
        targetUserId: command.afterOwner.id,
        summary: `Tenant actualizado: ${command.afterTenant.name}`,
        metadata: {
          before: {
            tenant: command.before.tenant,
            owner: this.toOwnerAuditSnapshotFromBackoffice(command.before.owner),
          },
          after: {
            tenant: this.toTenantAuditSnapshot(command.afterTenant),
            owner: this.toOwnerAuditSnapshot(command.afterOwner),
          },
        },
      },
    ];

    if (command.before.tenant.isActive !== command.afterTenant.isActive) {
      entries.push({
        actorUserId: command.actor.id,
        action: command.afterTenant.isActive
          ? "backoffice.tenant.activated"
          : "backoffice.tenant.deactivated",
        targetTenantId: command.afterTenant.id,
        targetUserId: command.afterOwner.id,
        summary: `Tenant ${command.afterTenant.isActive ? "activado" : "desactivado"}: ${
          command.afterTenant.name
        }`,
        metadata: {
          previousIsActive: command.before.tenant.isActive,
          nextIsActive: command.afterTenant.isActive,
        },
      });
    }

    if (command.before.owner.isActive !== command.afterOwner.isActive) {
      entries.push({
        actorUserId: command.actor.id,
        action: command.afterOwner.isActive
          ? "backoffice.owner.activated"
          : "backoffice.owner.deactivated",
        targetTenantId: command.afterTenant.id,
        targetUserId: command.afterOwner.id,
        summary: `Propietario ${command.afterOwner.isActive ? "activado" : "desactivado"}: ${
          command.afterOwner.email
        }`,
        metadata: {
          previousIsActive: command.before.owner.isActive,
          nextIsActive: command.afterOwner.isActive,
        },
      });
    }

    if (command.passwordWasReset) {
      entries.push({
        actorUserId: command.actor.id,
        action: "backoffice.owner.password_reset",
        targetTenantId: command.afterTenant.id,
        targetUserId: command.afterOwner.id,
        summary: `Clave de propietario reiniciada: ${command.afterOwner.email}`,
        metadata: {
          ownerId: command.afterOwner.id,
          ownerEmail: command.afterOwner.email,
        },
      });
    }

    return entries;
  }

  private toBackofficeTenant(tenant: TenantRow): BackofficeTenant {
    return backofficeTenantSchema.parse({
      id: tenant.id,
      documentType: tenant.documentType,
      documentNumber: tenant.documentNumber,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      departmentId: tenant.departmentId,
      municipalityId: tenant.municipalityId,
      city: tenant.city,
      department: tenant.department,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    });
  }

  private toBackofficeOwner(row: TenantOwnerSelection): BackofficeTenantOwner | null {
    if (
      row.ownerId === null ||
      row.ownerTenantId === null ||
      row.ownerEmail === null ||
      row.ownerFullName === null ||
      row.ownerIsActive === null ||
      row.ownerCreatedAt === null ||
      row.ownerUpdatedAt === null
    ) {
      return null;
    }

    return backofficeTenantOwnerSchema.parse({
      id: row.ownerId,
      tenantId: row.ownerTenantId,
      email: row.ownerEmail,
      fullName: row.ownerFullName,
      isActive: row.ownerIsActive,
      createdAt: row.ownerCreatedAt.toISOString(),
      updatedAt: row.ownerUpdatedAt.toISOString(),
    });
  }

  private toBackofficeOwnerFromUser(owner: UserRow): BackofficeTenantOwner {
    if (owner.tenantId === null) {
      throw new ConflictException("El propietario debe estar asociado a un tenant.");
    }

    return backofficeTenantOwnerSchema.parse({
      id: owner.id,
      tenantId: owner.tenantId,
      email: owner.email,
      fullName: owner.fullName,
      isActive: owner.isActive,
      createdAt: owner.createdAt.toISOString(),
      updatedAt: owner.updatedAt.toISOString(),
    });
  }

  private toTenantAuditSnapshot(tenant: TenantRow): Record<string, unknown> {
    return {
      id: tenant.id,
      documentType: tenant.documentType,
      documentNumber: tenant.documentNumber,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      departmentId: tenant.departmentId,
      municipalityId: tenant.municipalityId,
      city: tenant.city,
      department: tenant.department,
      isActive: tenant.isActive,
    };
  }

  private toOwnerAuditSnapshot(owner: UserRow): Record<string, unknown> {
    return {
      id: owner.id,
      tenantId: owner.tenantId,
      email: owner.email,
      fullName: owner.fullName,
      role: owner.role,
      isActive: owner.isActive,
    };
  }

  private toOwnerAuditSnapshotFromBackoffice(owner: BackofficeTenantOwner): Record<string, unknown> {
    return {
      id: owner.id,
      tenantId: owner.tenantId,
      email: owner.email,
      fullName: owner.fullName,
      role: "admin",
      isActive: owner.isActive,
    };
  }

  private throwConflictForUniqueViolation(error: unknown): never | void {
    if (!isPostgresUniqueViolation(error)) {
      return;
    }

    const constraintName = error.constraint_name ?? error.constraint ?? "";

    if (constraintName === "tenants_document_unique") {
      throw new ConflictException("Ya existe un tenant con ese documento.");
    }

    if (constraintName === "tenants_email_unique") {
      throw new ConflictException("Ya existe un tenant con ese correo.");
    }

    if (constraintName === "users_email_unique") {
      throw new ConflictException("Ya existe un usuario con ese correo.");
    }

    if (constraintName === "users_tenant_owner_unique") {
      throw new ConflictException("El tenant ya tiene un propietario.");
    }

    throw new ConflictException("La operacion entra en conflicto con datos existentes.");
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
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
