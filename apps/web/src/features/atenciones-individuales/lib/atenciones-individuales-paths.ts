export function buildAtencionIndividualCreatePath(adultoMayorId: string): string {
  return `/adultos-mayores/${adultoMayorId}/atenciones/new`;
}

export function buildHistoriaClinicaPath(adultoMayorId: string): string {
  return `/adultos-mayores/${adultoMayorId}/historia-clinica`;
}

export function buildAtencionIndividualDetailPath(
  adultoMayorId: string,
  atencionId: string,
): string {
  return `/adultos-mayores/${adultoMayorId}/atenciones/${atencionId}`;
}

const ATENCION_CREATE_PATH_PATTERN = /^\/adultos-mayores\/([^/]+)\/atenciones\/new$/;
const HISTORIA_CLINICA_PATH_PATTERN = /^\/adultos-mayores\/([^/]+)\/historia-clinica$/;
const ATENCION_DETAIL_PATH_PATTERN = /^\/adultos-mayores\/([^/]+)\/atenciones\/([^/]+)$/;

export function getAtencionIndividualCreateAdultoIdFromPath(path: string): string | null {
  const match = ATENCION_CREATE_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getHistoriaClinicaAdultoIdFromPath(path: string): string | null {
  const match = HISTORIA_CLINICA_PATH_PATTERN.exec(path);

  return match?.[1] ?? null;
}

export function getAtencionIndividualDetailIdsFromPath(
  path: string,
): { adultoMayorId: string; atencionId: string } | null {
  const match = ATENCION_DETAIL_PATH_PATTERN.exec(path);

  if (match === null || match[1] === undefined || match[2] === undefined) {
    return null;
  }

  return {
    adultoMayorId: match[1],
    atencionId: match[2],
  };
}
