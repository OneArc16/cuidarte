import {
  hasUserPermission,
  type AtencionEnfermeriaHistoryAccess,
  atencionEnfermeriaCrossReadRoleValues,
  atencionEnfermeriaModuleRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

const ATENCIONES_ENFERMERIA_MODULE_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionEnfermeriaModuleRoleValues,
);
const ATENCIONES_ENFERMERIA_CROSS_READ_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  atencionEnfermeriaCrossReadRoleValues,
);

export function canOpenAtencionesEnfermeria(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ATENCIONES_ENFERMERIA_MODULE_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.view");
}

export function canOpenAtencionesEnfermeriaModule(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return canOpenAtencionesEnfermeria(user);
}

export function canReadAtencionesEnfermeria(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ATENCIONES_ENFERMERIA_CROSS_READ_ROLES.has(user.role)
    : hasUserPermission(user, "atenciones_enfermeria.view");
}

export function canCreateAtencionesEnfermeria(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "enfermeria"
    : hasUserPermission(user, "atenciones_enfermeria.create");
}

export function canCreateAtencionEnfermeria(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return canCreateAtencionesEnfermeria(user);
}

type AtencionEnfermeriaActor = Pick<AuthUser, "id" | "role" | "tenantId" | "permissions">;
type AtencionEnfermeriaRecordOwner = {
  createdByUserId: string;
  tenantId: string;
};

export function resolveAtencionEnfermeriaAccess(
  user: AtencionEnfermeriaActor,
  record: AtencionEnfermeriaRecordOwner,
): AtencionEnfermeriaHistoryAccess | null {
  if (user.tenantId !== record.tenantId) {
    return null;
  }

  if (user.permissions !== undefined) {
    if (
      hasUserPermission(user, "atenciones_enfermeria.edit") &&
      record.createdByUserId === user.id
    ) {
      return "edit";
    }

    return hasUserPermission(user, "atenciones_enfermeria.view") ? "view" : null;
  }

  if (user.role === "enfermeria" && record.createdByUserId === user.id) {
    return "edit";
  }

  if (ATENCIONES_ENFERMERIA_CROSS_READ_ROLES.has(user.role)) {
    return "view";
  }

  return null;
}

export function canEditAtencionEnfermeria(
  user: AtencionEnfermeriaActor,
  record: AtencionEnfermeriaRecordOwner,
): boolean {
  return resolveAtencionEnfermeriaAccess(user, record) === "edit";
}
