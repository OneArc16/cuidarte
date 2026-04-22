export const BACKOFFICE_PATH = "/backoffice";
export const BACKOFFICE_NEW_TENANT_PATH = "/backoffice/tenants/new";

const TENANT_DETAIL_PATH_PATTERN = /^\/backoffice\/tenants\/([^/]+)$/;

export function isBackofficePath(path: string): boolean {
  return path === BACKOFFICE_PATH || path.startsWith(`${BACKOFFICE_PATH}/`);
}

export function getTenantIdFromPath(path: string): string | null {
  const match = TENANT_DETAIL_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}
