import {
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
  if (user.role === "super_admin") {
    return { type: "all" };
  }

  if (user.tenantId === null) {
    return null;
  }

  return { type: "tenant", tenantId: user.tenantId };
}

export function canOpenAtencionEnfermeriaModule(user: Pick<AuthUser, "role">): boolean {
  return MODULE_ROLES.has(user.role);
}

export function canReadAtencionEnfermeriaModule(user: Pick<AuthUser, "role">): boolean {
  return VIEW_ROLES.has(user.role);
}

export function canCreateAtencionEnfermeria(user: Pick<AuthUser, "role">): boolean {
  return CREATE_ROLES.has(user.role);
}

export function canManageAtencionEnfermeriaTrash(user: Pick<AuthUser, "role">): boolean {
  return TRASH_ROLES.has(user.role);
}

export function resolveAtencionEnfermeriaAccess(
  user: Pick<AuthUser, "id" | "role" | "tenantId">,
  record: AtencionEnfermeriaOwnership,
): AtencionEnfermeriaHistoryAccess | null {
  if (user.role === "super_admin") {
    return "view";
  }

  if (user.tenantId === null || record.tenantId !== user.tenantId) {
    return null;
  }

  if (user.role === "enfermeria" && record.createdByUserId === user.id) {
    return "edit";
  }

  return VIEW_ROLES.has(user.role) ? "view" : null;
}

export function canViewAtencionEnfermeria(
  user: Pick<AuthUser, "id" | "role" | "tenantId">,
  record: AtencionEnfermeriaOwnership,
): boolean {
  return resolveAtencionEnfermeriaAccess(user, record) !== null;
}

export function canEditAtencionEnfermeria(
  user: Pick<AuthUser, "id" | "role" | "tenantId">,
  record: AtencionEnfermeriaOwnership,
): boolean {
  return resolveAtencionEnfermeriaAccess(user, record) === "edit";
}
