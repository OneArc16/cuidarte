export const EMPLEADOS_PATH = "/gestion-empleados";
export const EMPLEADOS_NEW_PATH = `${EMPLEADOS_PATH}/new`;

const EMPLEADO_EDIT_PATH_PATTERN = /^\/gestion-empleados\/([^/]+)\/edit$/;

export function isEmpleadosPath(path: string): boolean {
  return path === EMPLEADOS_PATH || path.startsWith(`${EMPLEADOS_PATH}/`);
}

export function buildEmpleadoEditPath(empleadoId: string): string {
  return `${EMPLEADOS_PATH}/${empleadoId}/edit`;
}

export function getEmpleadoEditIdFromPath(path: string): string | null {
  const match = EMPLEADO_EDIT_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}
