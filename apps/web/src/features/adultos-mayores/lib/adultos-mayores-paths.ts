export const ADULTOS_MAYORES_PATH = "/adultos-mayores";
export const ADULTOS_MAYORES_NEW_PATH = `${ADULTOS_MAYORES_PATH}/new`;
export const ADULTOS_MAYORES_IMPORT_PATH = `${ADULTOS_MAYORES_PATH}/importar`;

const ADULTO_MAYOR_EDIT_PATH_PATTERN = /^\/adultos-mayores\/([^/]+)\/edit$/;

export function isAdultosMayoresPath(path: string): boolean {
  return path === ADULTOS_MAYORES_PATH || path.startsWith(`${ADULTOS_MAYORES_PATH}/`);
}

export function buildAdultoMayorEditPath(adultoMayorId: string): string {
  return `${ADULTOS_MAYORES_PATH}/${adultoMayorId}/edit`;
}

export function getAdultoMayorEditIdFromPath(path: string): string | null {
  const match = ADULTO_MAYOR_EDIT_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function isAdultosMayoresImportPath(path: string): boolean {
  return path === ADULTOS_MAYORES_IMPORT_PATH;
}
