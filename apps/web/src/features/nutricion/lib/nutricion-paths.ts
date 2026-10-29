export const NUTRICION_PATH = "/nutricion";

const NUTRICION_ADULTO_PATH_PATTERN = /^\/nutricion\/adultos-mayores\/([^/]+)$/;
const NUTRICION_ATTENTION_CREATE_PATH_PATTERN = /^\/nutricion\/adultos-mayores\/([^/]+)\/new$/;
const NUTRICION_HISTORY_PATH_PATTERN = /^\/nutricion\/adultos-mayores\/([^/]+)\/history$/;

export function isNutricionPath(path: string): boolean {
  return path === NUTRICION_PATH || path.startsWith(`${NUTRICION_PATH}/`);
}

export function buildNutricionAdultoPath(adultoMayorId: string): string {
  return `${NUTRICION_PATH}/adultos-mayores/${adultoMayorId}`;
}

export function buildNutricionAttentionCreatePath(adultoMayorId: string): string {
  return `${NUTRICION_PATH}/adultos-mayores/${adultoMayorId}/new`;
}

export function buildNutricionHistoryPath(adultoMayorId: string): string {
  return `${NUTRICION_PATH}/adultos-mayores/${adultoMayorId}/history`;
}

export function getNutricionAdultoIdFromPath(path: string): string | null {
  return NUTRICION_ADULTO_PATH_PATTERN.exec(path)?.[1] ?? null;
}

export function getNutricionAttentionCreateAdultoIdFromPath(path: string): string | null {
  return NUTRICION_ATTENTION_CREATE_PATH_PATTERN.exec(path)?.[1] ?? null;
}

export function getNutricionHistoryAdultoIdFromPath(path: string): string | null {
  return NUTRICION_HISTORY_PATH_PATTERN.exec(path)?.[1] ?? null;
}
