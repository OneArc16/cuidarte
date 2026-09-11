import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException, BadRequestException } from "@nestjs/common";

export function assertCanUseReports(actor: AuthUser): void {
  if (actor.role === "super_admin" || actor.role === "admin" || actor.role === "director") {
    return;
  }

  throw new ForbiddenException("No tienes permisos para acceder al modulo de reportes.");
}

export function resolveReportTenantId(actor: AuthUser, requestedTenantId: string | null): string {
  assertCanUseReports(actor);

  if (actor.role === "super_admin") {
    if (requestedTenantId === null) {
      throw new BadRequestException("Selecciona un centro para generar el reporte.");
    }

    return requestedTenantId;
  }

  if (actor.tenantId === null) {
    throw new ForbiddenException("No tienes un centro asociado para generar reportes.");
  }

  if (requestedTenantId !== null && requestedTenantId !== actor.tenantId) {
    throw new ForbiddenException("No puedes generar reportes de un centro diferente al tuyo.");
  }

  return actor.tenantId;
}

export function assertCanAccessReportJob(
  actor: AuthUser,
  job: { tenantId: string; requestedByUserId: string },
): void {
  assertCanUseReports(actor);

  if (actor.role === "super_admin") {
    return;
  }

  if (actor.tenantId !== job.tenantId) {
    throw new ForbiddenException("No puedes acceder a reportes de otro centro.");
  }
}

export function canCancelReportStatus(status: string): boolean {
  return status === "pending" || status === "processing";
}
