export const CREACION_ACTIVIDADES_PATH = "/creacion-actividades";
export const CREACION_ACTIVIDADES_NEW_PATH = `${CREACION_ACTIVIDADES_PATH}/new`;
export const CREACION_ACTIVIDADES_EDIT_PATH_PATTERN = `${CREACION_ACTIVIDADES_PATH}/:id/editar`;
export const CREACION_ACTIVIDADES_TRASH_PATH = `${CREACION_ACTIVIDADES_PATH}/papelera`;

const ACTIVIDAD_GRUPAL_DILIGENCIAMIENTO_PATH_PATTERN =
  /^\/creacion-actividades\/([^/]+)\/diligenciamiento$/;
const ACTIVIDAD_GRUPAL_EDIT_PATH_PATTERN = /^\/creacion-actividades\/([^/]+)\/editar$/;

export function isActividadesGrupalesPath(path: string): boolean {
  return path === CREACION_ACTIVIDADES_PATH || path.startsWith(`${CREACION_ACTIVIDADES_PATH}/`);
}

export function isActividadesGrupalesTrashPath(path: string): boolean {
  return path === CREACION_ACTIVIDADES_TRASH_PATH;
}

export function buildActividadGrupalDiligenciamientoPath(activityId: string): string {
  return `${CREACION_ACTIVIDADES_PATH}/${activityId}/diligenciamiento`;
}

export function buildActividadGrupalEditPath(activityId: string): string {
  return `${CREACION_ACTIVIDADES_PATH}/${activityId}/editar`;
}

export function getActividadGrupalDiligenciamientoIdFromPath(path: string): string | null {
  const match = ACTIVIDAD_GRUPAL_DILIGENCIAMIENTO_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getActividadGrupalEditIdFromPath(path: string): string | null {
  const match = ACTIVIDAD_GRUPAL_EDIT_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}
