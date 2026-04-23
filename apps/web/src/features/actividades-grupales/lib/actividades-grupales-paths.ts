export const CREACION_ACTIVIDADES_PATH = "/creacion-actividades";
export const CREACION_ACTIVIDADES_NEW_PATH = `${CREACION_ACTIVIDADES_PATH}/new`;

export function isActividadesGrupalesPath(path: string): boolean {
  return path === CREACION_ACTIVIDADES_PATH || path.startsWith(`${CREACION_ACTIVIDADES_PATH}/`);
}
