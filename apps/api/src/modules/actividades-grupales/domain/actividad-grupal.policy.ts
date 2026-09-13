import { type ActividadGrupalOrganizer, type AuthUser, type UserRole } from "@cuidarte/contracts";

import {
  type ActividadGrupalRecord,
  type ActividadesGrupalesScope,
} from "./actividad-grupal.types";

const ORGANIZERS_BY_PROFESSIONAL_ROLE: Partial<
  Record<UserRole, readonly ActividadGrupalOrganizer[]>
> = {
  enfermeria: ["medico", "enfermeria"],
  fisioterapeuta: ["fisioterapeuta"],
  medico: ["medico", "enfermeria"],
  nutricionista: ["nutricionista"],
  psicologo: ["psicologa", "trabajadora_social"],
  recreacionista: ["recreacionista"],
  trabajadora_social: ["psicologa", "trabajadora_social"],
};

/**
 * Null means that the role is allowed to see every organizing team.
 * Professional teams are intentionally defined by the activity organizer, which
 * is the persisted source of truth for a session's responsible area.
 */
export function resolvePermittedActividadGrupalOrganizers(
  user: Pick<AuthUser, "role">,
): readonly ActividadGrupalOrganizer[] | null {
  return ORGANIZERS_BY_PROFESSIONAL_ROLE[user.role] ?? null;
}

export function canViewActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "organizer">,
  user: Pick<AuthUser, "role">,
): boolean {
  const permittedOrganizers = resolvePermittedActividadGrupalOrganizers(user);

  return permittedOrganizers === null || permittedOrganizers.includes(activity.organizer);
}

export function resolveActividadesGrupalesScope(user: AuthUser): ActividadesGrupalesScope | null {
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return {
    type: "tenant",
    tenantId: user.tenantId,
  };
}

export function canManageActividadesGrupales(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "auditor";
}

export function canCorrectActividadGrupalActaNumber(user: Pick<AuthUser, "role">): boolean {
  return user.role === "super_admin";
}

export function canBulkCorrectActividadGrupalActaNumbers(user: Pick<AuthUser, "role">): boolean {
  return user.role === "super_admin";
}

export function canListTrashActividadesGrupales(
  user: Pick<AuthUser, "role" | "tenantId">,
): boolean {
  if (user.role === "super_admin") {
    return true;
  }

  return user.role !== "auditor" && user.tenantId !== null;
}

export function canTrashActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "createdByUserId" | "tenantId">,
  actor: AuthUser,
): boolean {
  if (actor.role === "super_admin") {
    return true;
  }

  if (activity.createdByUserId === actor.id) {
    return true;
  }

  return (
    (actor.role === "admin" || actor.role === "director") && actor.tenantId === activity.tenantId
  );
}

export function canRestoreActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "createdByUserId" | "tenantId">,
  actor: AuthUser,
): boolean {
  return canTrashActividadGrupal(activity, actor);
}

export function resolveActividadGrupalTenantForCreate(
  user: AuthUser,
  requestedTenantId: string | null,
): string | null {
  if (user.role === "super_admin") {
    return requestedTenantId;
  }

  return user.tenantId;
}
