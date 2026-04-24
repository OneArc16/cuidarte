export const CREACION_ACTIVIDADES_PATH = "/creacion-actividades";
export const CREACION_ACTIVIDADES_NEW_PATH = `${CREACION_ACTIVIDADES_PATH}/new`;

const ACTIVIDAD_GRUPAL_DILIGENCIAMIENTO_PATH_PATTERN =
  /^\/creacion-actividades\/([^/]+)\/diligenciamiento$/;

export function isActividadesGrupalesPath(path: string): boolean {
  return path === CREACION_ACTIVIDADES_PATH || path.startsWith(`${CREACION_ACTIVIDADES_PATH}/`);
}

export function buildActividadGrupalDiligenciamientoPath(activityId: string): string {
  return `${CREACION_ACTIVIDADES_PATH}/${activityId}/diligenciamiento`;
}

export function getActividadGrupalDiligenciamientoIdFromPath(path: string): string | null {
  const match = ACTIVIDAD_GRUPAL_DILIGENCIAMIENTO_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}
