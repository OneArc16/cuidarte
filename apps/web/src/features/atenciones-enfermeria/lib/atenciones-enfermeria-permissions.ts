import {
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

export function canOpenAtencionesEnfermeria(user: Pick<AuthUser, "role">): boolean {
  return ATENCIONES_ENFERMERIA_MODULE_ROLES.has(user.role);
}

export function canOpenAtencionesEnfermeriaModule(user: Pick<AuthUser, "role">): boolean {
  return canOpenAtencionesEnfermeria(user);
}

export function canReadAtencionesEnfermeria(user: Pick<AuthUser, "role">): boolean {
  return ATENCIONES_ENFERMERIA_CROSS_READ_ROLES.has(user.role);
}

export function canCreateAtencionesEnfermeria(user: Pick<AuthUser, "role">): boolean {
  return user.role === "enfermeria";
}

export function canCreateAtencionEnfermeria(user: Pick<AuthUser, "role">): boolean {
  return canCreateAtencionesEnfermeria(user);
}

type AtencionEnfermeriaActor = Pick<AuthUser, "id" | "role" | "tenantId">;
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
