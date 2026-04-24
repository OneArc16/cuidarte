export const REGISTRO_ALIMENTACION_PATH = "/registro-alimentacion";
export const REGISTRO_ALIMENTACION_NEW_PATH = `${REGISTRO_ALIMENTACION_PATH}/new`;

const REGISTRO_ALIMENTACION_NEW_FROM_ADULTO_PATTERN = /^\/registro-alimentacion\/new\/([^/]+)$/;
const REGISTRO_ALIMENTACION_EDIT_PATTERN = /^\/registro-alimentacion\/([^/]+)\/edit$/;

export function isAlimentacionPath(path: string): boolean {
  return path === REGISTRO_ALIMENTACION_PATH || path.startsWith(`${REGISTRO_ALIMENTACION_PATH}/`);
}

export function buildAlimentacionCreateFromAdultoPath(adultoMayorId: string): string {
  return `${REGISTRO_ALIMENTACION_NEW_PATH}/${adultoMayorId}`;
}

export function buildAlimentacionEditPath(recordId: string): string {
  return `${REGISTRO_ALIMENTACION_PATH}/${recordId}/edit`;
}

export function getAlimentacionCreateAdultoMayorIdFromPath(path: string): string | null {
  const match = REGISTRO_ALIMENTACION_NEW_FROM_ADULTO_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getAlimentacionEditIdFromPath(path: string): string | null {
  const match = REGISTRO_ALIMENTACION_EDIT_PATTERN.exec(path);

  return match?.[1] ?? null;
}
