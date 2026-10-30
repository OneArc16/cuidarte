export const TRABAJO_SOCIAL_PATH = "/trabajo-social";
const createPattern = /^\/trabajo-social\/adultos-mayores\/([^/]+)\/new$/;
const historyPattern = /^\/trabajo-social\/adultos-mayores\/([^/]+)\/history$/;

export const buildTrabajoSocialCreatePath = (id: string) =>
  `${TRABAJO_SOCIAL_PATH}/adultos-mayores/${id}/new`;
export const buildTrabajoSocialHistoryPath = (id: string) =>
  `${TRABAJO_SOCIAL_PATH}/adultos-mayores/${id}/history`;
export const getTrabajoSocialCreateAdultoIdFromPath = (path: string) =>
  createPattern.exec(path)?.[1] ?? null;
export const getTrabajoSocialHistoryAdultoIdFromPath = (path: string) =>
  historyPattern.exec(path)?.[1] ?? null;
export const isTrabajoSocialPath = (path: string) =>
  path === TRABAJO_SOCIAL_PATH || path.startsWith(`${TRABAJO_SOCIAL_PATH}/`);
