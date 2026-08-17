export const ATENCIONES_ENFERMERIA_PATH = "/atenciones-enfermeria";

const ATENCION_ENFERMERIA_DETAIL_PATH_PATTERN = /^\/atenciones-enfermeria\/([^/]+)$/;
const ATENCION_ENFERMERIA_CREATE_PATH_PATTERN =
  /^\/atenciones-enfermeria\/adultos-mayores\/([^/]+)\/new$/;
const ATENCION_ENFERMERIA_HISTORY_PATH_PATTERN =
  /^\/atenciones-enfermeria\/adultos-mayores\/([^/]+)\/history$/;

export function isAtencionesEnfermeriaPath(path: string): boolean {
  return path === ATENCIONES_ENFERMERIA_PATH || path.startsWith(`${ATENCIONES_ENFERMERIA_PATH}/`);
}

export function buildAtencionEnfermeriaCreatePath(adultoMayorId: string): string {
  return `${ATENCIONES_ENFERMERIA_PATH}/adultos-mayores/${adultoMayorId}/new`;
}

export function buildAtencionEnfermeriaDetailPath(atencionId: string): string {
  return `${ATENCIONES_ENFERMERIA_PATH}/${atencionId}`;
}

export function buildAtencionesEnfermeriaHistoryPath(adultoMayorId: string): string {
  return `${ATENCIONES_ENFERMERIA_PATH}/adultos-mayores/${adultoMayorId}/history`;
}

export function getAtencionEnfermeriaCreateAdultoIdFromPath(path: string): string | null {
  const match = ATENCION_ENFERMERIA_CREATE_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getAtencionEnfermeriaDetailIdFromPath(path: string): string | null {
  const match = ATENCION_ENFERMERIA_DETAIL_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getAtencionesEnfermeriaHistoryAdultoIdFromPath(path: string): string | null {
  const match = ATENCION_ENFERMERIA_HISTORY_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}
