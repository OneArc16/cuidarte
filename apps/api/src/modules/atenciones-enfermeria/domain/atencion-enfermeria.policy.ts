import {
  hasUserPermission,
  type AtencionEnfermeriaHistoryAccess,
  atencionEnfermeriaCrossReadRoleValues,
  atencionEnfermeriaModuleRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

type AtencionEnfermeriaScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

type AtencionEnfermeriaOwnership = {
  tenantId: string;
  createdByUserId: string;
};

const MODULE_ROLES: ReadonlySet<AuthUser["role"]> = new Set(atencionEnfermeriaModuleRoleValues);
const VIEW_ROLES: ReadonlySet<AuthUser["role"]> = new Set(atencionEnfermeriaCrossReadRoleValues);
const CREATE_ROLES: ReadonlySet<AuthUser["role"]> = new Set(["enfermeria"]);
const TRASH_ROLES: ReadonlySet<AuthUser["role"]> = new Set(["super_admin", "admin", "director"]);

export function resolveAtencionEnfermeriaScope(user: AuthUser): AtencionEnfermeriaScope | null {
  if (user.permissions !== undefined && !hasUserPermission(user, "atenciones_enfermeria.view")) {
    return null;
  }

  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return { type: "tenant", tenantId: user.tenantId };
}

export function canOpenAtencionEnfermeriaModule(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? MODULE_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.view");
}

export function canReadAtencionEnfermeriaModule(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? VIEW_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.view");
}

export function canCreateAtencionEnfermeria(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? CREATE_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.create");
}

export function canManageAtencionEnfermeriaTrash(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? TRASH_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.delete");
}

export function resolveAtencionEnfermeriaAccess(
  user: Pick<AuthUser, "id" | "role" | "tenantId" | "permissions">,
  record: AtencionEnfermeriaOwnership,
): AtencionEnfermeriaHistoryAccess | null {
  if (
    user.role === "super_admin" &&
    (user.permissions === undefined || hasUserPermission(user, "atenciones_enfermeria.view"))
  ) {
    return "view";
  }

  if (user.tenantId === null || record.tenantId !== user.tenantId) {
    return null;
  }

  if (
    (user.permissions === undefined
      ? user.role === "enfermeria"
      : hasUserPermission(user, "atenciones_enfermeria.edit")) &&
    record.createdByUserId === user.id
  ) {
    return "edit";
  }

  return user.permissions === undefined
    ? VIEW_ROLES.has(user.role)
      ? "view"
      : null
    : hasUserPermission(user, "atenciones_enfermeria.view")
      ? "view"
      : null;
}

export function canViewAtencionEnfermeria(
  user: Pick<AuthUser, "id" | "role" | "tenantId" | "permissions">,
  record: AtencionEnfermeriaOwnership,
): boolean {
  return resolveAtencionEnfermeriaAccess(user, record) !== null;
}

export function canEditAtencionEnfermeria(
  user: Pick<AuthUser, "id" | "role" | "tenantId" | "permissions">,
  record: AtencionEnfermeriaOwnership,
): boolean {
  return resolveAtencionEnfermeriaAccess(user, record) === "edit";
}
