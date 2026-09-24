import {
  hasUserPermission,
  type ActividadGrupalOrganizer,
  type AuthUser,
  type UserRole,
} from "@cuidarte/contracts";

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

const OWN_ORGANIZER_BY_ROLE: Partial<Record<UserRole, ActividadGrupalOrganizer>> = {
  director: "director",
  enfermeria: "enfermeria",
  fisioterapeuta: "fisioterapeuta",
  medico: "medico",
  nutricionista: "nutricionista",
  psicologo: "psicologa",
  recreacionista: "recreacionista",
  trabajadora_social: "trabajadora_social",
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

export function resolveCreatableActividadGrupalOrganizers(
  user: Pick<AuthUser, "role" | "allowedActividadGrupalOrganizers">,
): readonly ActividadGrupalOrganizer[] {
  if (user.role === "super_admin" || user.role === "admin") {
    return [
      "director",
      "medico",
      "enfermeria",
      "psicologa",
      "trabajadora_social",
      "nutricionista",
      "fisioterapeuta",
      "recreacionista",
    ];
  }

  const ownOrganizer = OWN_ORGANIZER_BY_ROLE[user.role];
  const allowedOrganizers = user.allowedActividadGrupalOrganizers ?? [];

  return [
    ...new Set(
      ownOrganizer === undefined ? allowedOrganizers : [ownOrganizer, ...allowedOrganizers],
    ),
  ];
}

export function canCreateActividadGrupalWithOrganizer(
  user: Pick<AuthUser, "role" | "allowedActividadGrupalOrganizers">,
  organizer: ActividadGrupalOrganizer,
): boolean {
  return resolveCreatableActividadGrupalOrganizers(user).includes(organizer);
}

export function canViewActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "organizer" | "activityTypeCreatorUserIds">,
  user: Pick<AuthUser, "role" | "permissions"> & { id?: string },
): boolean {
  if (user.permissions !== undefined && !hasUserPermission(user, "actividades_grupales.view")) {
    return false;
  }

  const permittedOrganizers = resolvePermittedActividadGrupalOrganizers(user);
  const isConfiguredCreator =
    user.id !== undefined && (activity.activityTypeCreatorUserIds?.includes(user.id) ?? false);

  return (
    isConfiguredCreator ||
    permittedOrganizers === null ||
    permittedOrganizers.includes(activity.organizer)
  );
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

export function canManageActividadesGrupales(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role !== "auditor"
    : hasUserPermission(user, "actividades_grupales.create") ||
        hasUserPermission(user, "actividades_grupales.edit");
}

export function canCorrectActividadGrupalActaNumber(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin"
    : hasUserPermission(user, "actividades_grupales.correct");
}

export function canBulkCorrectActividadGrupalActaNumbers(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin"
    : hasUserPermission(user, "actividades_grupales.correct");
}

export function canListTrashActividadesGrupales(
  user: Pick<AuthUser, "role" | "tenantId" | "permissions">,
): boolean {
  if (user.permissions === undefined) {
    return user.role === "super_admin" || (user.role === "admin" && user.tenantId !== null);
  }

  return (
    hasUserPermission(user, "actividades_grupales.delete") &&
    (user.role === "super_admin" || user.tenantId !== null)
  );
}

export function canTrashActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "tenantId">,
  actor: AuthUser,
): boolean {
  if (actor.permissions === undefined) {
    return (
      actor.role === "super_admin" ||
      (actor.role === "admin" && actor.tenantId === activity.tenantId)
    );
  }

  if (!hasUserPermission(actor, "actividades_grupales.delete")) {
    return false;
  }

  return actor.role === "super_admin" || actor.tenantId === activity.tenantId;
}

export function canEditActividadGrupal(
  activity: Pick<ActividadGrupalRecord, "createdByUserId" | "tenantId">,
  actor: AuthUser,
  isAssignedProfessional = false,
): boolean {
  if (actor.permissions !== undefined && !hasUserPermission(actor, "actividades_grupales.edit")) {
    return false;
  }
  if (actor.role === "super_admin") {
    return true;
  }

  if (activity.createdByUserId === actor.id || isAssignedProfessional) {
    return true;
  }

  return (
    (actor.role === "admin" || actor.role === "director") && actor.tenantId === activity.tenantId
  );
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
