import { Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { auditLogs, tenantBranding, tenantLogoVersions, tenants } from "../../../database/schema";
import { type TenantBrandingRepository } from "../domain/tenant-branding.repository";
import {
  type CreateAndActivateTenantLogoCommand,
  type RemoveActiveTenantLogoCommand,
  type TenantLogoVersionRecord,
} from "../domain/tenant-branding.types";

@Injectable()
export class DrizzleTenantBrandingRepository implements TenantBrandingRepository {
  constructor(private readonly database: DatabaseService) {}

  async tenantExists(tenantId: string): Promise<boolean> {
    const [row] = await this.database.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return row !== undefined;
  }

  async findActiveLogoByTenantId(tenantId: string): Promise<TenantLogoVersionRecord | null> {
    const [row] = await this.database.db
      .select({ version: tenantLogoVersions })
      .from(tenantBranding)
      .innerJoin(
        tenantLogoVersions,
        and(
          eq(tenantLogoVersions.id, tenantBranding.activeLogoVersionId),
          eq(tenantLogoVersions.tenantId, tenantBranding.tenantId),
        ),
      )
      .where(eq(tenantBranding.tenantId, tenantId))
      .limit(1);

    return row === undefined ? null : this.toRecord(row.version);
  }

  async createAndActivateLogo(
    command: CreateAndActivateTenantLogoCommand,
  ): Promise<TenantLogoVersionRecord> {
    return await this.database.db.transaction(async (tx) => {
      const [currentBranding] = await tx
        .select({ activeLogoVersionId: tenantBranding.activeLogoVersionId })
        .from(tenantBranding)
        .where(eq(tenantBranding.tenantId, command.tenantId))
        .limit(1);
      const previousLogoVersionId = currentBranding?.activeLogoVersionId ?? null;
      const now = new Date();
      const [created] = await tx
        .insert(tenantLogoVersions)
        .values({
          tenantId: command.tenantId,
          originalName: command.originalName,
          mimeType: command.mimeType,
          sizeBytes: command.sizeBytes,
          checksum: command.checksum,
          relativePath: command.relativePath,
          uploadedByUserId: command.actorUserId,
          createdAt: now,
        })
        .returning();

      if (created === undefined) {
        throw new Error("No fue posible crear la version del logo.");
      }

      await tx
        .insert(tenantBranding)
        .values({
          tenantId: command.tenantId,
          activeLogoVersionId: created.id,
          updatedByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: tenantBranding.tenantId,
          set: {
            activeLogoVersionId: created.id,
            updatedByUserId: command.actorUserId,
            updatedAt: now,
          },
        });

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: previousLogoVersionId === null ? "tenant.logo_uploaded" : "tenant.logo_replaced",
        targetTenantId: command.tenantId,
        summary:
          previousLogoVersionId === null
            ? "Logo del centro cargado."
            : "Logo del centro reemplazado.",
        metadata: {
          tenantId: command.tenantId,
          logoVersionId: created.id,
          previousLogoVersionId,
          originalName: command.originalName,
          mimeType: command.mimeType,
          sizeBytes: command.sizeBytes,
          checksum: command.checksum,
          actorUserId: command.actorUserId,
        },
      });

      return this.toRecord(created);
    });
  }

  async removeActiveLogo(command: RemoveActiveTenantLogoCommand): Promise<void> {
    await this.database.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ activeLogoVersionId: tenantBranding.activeLogoVersionId })
        .from(tenantBranding)
        .where(eq(tenantBranding.tenantId, command.tenantId))
        .limit(1);
      const previousLogoVersionId = current?.activeLogoVersionId ?? null;

      if (previousLogoVersionId === null) {
        return;
      }

      await tx
        .update(tenantBranding)
        .set({
          activeLogoVersionId: null,
          updatedByUserId: command.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(tenantBranding.tenantId, command.tenantId));

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "tenant.logo_removed",
        targetTenantId: command.tenantId,
        summary: "Logo activo del centro retirado.",
        metadata: {
          tenantId: command.tenantId,
          logoVersionId: previousLogoVersionId,
          previousLogoVersionId,
          actorUserId: command.actorUserId,
        },
      });
    });
  }

  private toRecord(row: typeof tenantLogoVersions.$inferSelect): TenantLogoVersionRecord {
    if (row.mimeType !== "image/png") {
      throw new Error("La version del logo no esta normalizada como PNG.");
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      originalName: row.originalName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksum: row.checksum,
      relativePath: row.relativePath,
      uploadedByUserId: row.uploadedByUserId,
      createdAt: row.createdAt,
    };
  }
}
