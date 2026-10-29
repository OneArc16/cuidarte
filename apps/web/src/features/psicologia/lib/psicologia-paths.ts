export const PSICOLOGIA_PATH = "/psicologia";
const createPattern = /^\/psicologia\/adultos-mayores\/([^/]+)\/new$/;
const historyPattern = /^\/psicologia\/adultos-mayores\/([^/]+)\/history$/;
export const buildPsicologiaCreatePath = (id: string) =>
  `${PSICOLOGIA_PATH}/adultos-mayores/${id}/new`;
export const buildPsicologiaHistoryPath = (id: string) =>
  `${PSICOLOGIA_PATH}/adultos-mayores/${id}/history`;
export const getPsicologiaCreateAdultoIdFromPath = (path: string) =>
  createPattern.exec(path)?.[1] ?? null;
export const getPsicologiaHistoryAdultoIdFromPath = (path: string) =>
  historyPattern.exec(path)?.[1] ?? null;
export const isPsicologiaPath = (path: string) =>
  path === PSICOLOGIA_PATH || path.startsWith(`${PSICOLOGIA_PATH}/`);
