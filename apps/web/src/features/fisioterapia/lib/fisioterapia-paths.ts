export const FISIOTERAPIA_PATH = "/fisioterapia";
const createPattern = /^\/fisioterapia\/adultos-mayores\/([^/]+)\/nueva-sesion$/;
const historyPattern = /^\/fisioterapia\/adultos-mayores\/([^/]+)\/historial$/;
export const isFisioterapiaPath = (path: string) =>
  path === FISIOTERAPIA_PATH || path.startsWith(`${FISIOTERAPIA_PATH}/`);
export const buildFisioterapiaCreatePath = (id: string) =>
  `${FISIOTERAPIA_PATH}/adultos-mayores/${id}/nueva-sesion`;
export const buildFisioterapiaHistoryPath = (id: string) =>
  `${FISIOTERAPIA_PATH}/adultos-mayores/${id}/historial`;
export const getFisioterapiaCreateAdultoIdFromPath = (path: string) =>
  createPattern.exec(path)?.[1] ?? null;
export const getFisioterapiaHistoryAdultoIdFromPath = (path: string) =>
  historyPattern.exec(path)?.[1] ?? null;
