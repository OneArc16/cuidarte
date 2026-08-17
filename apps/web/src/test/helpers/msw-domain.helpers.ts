import { http, HttpResponse } from "msw";

import { type AuthSessionUser } from "./msw-auth.helpers";

const AUTH_LOGIN_ENDPOINT = "http://localhost:3001/api/auth/login";
const ATENCIONES_HISTORY_ENDPOINT =
  "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/history";
const ATENCIONES_MEDICAL_HISTORY_ENDPOINT =
  "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/medical-history";
const ACTIVIDADES_DILIGENCIAMIENTO_ENDPOINT =
  "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento";
const ALIMENTACION_LOOKUP_ENDPOINT =
  "http://localhost:3001/api/registro-alimentacion/adultos-mayores/:adultoMayorId/lookup";

type HistoriaClinicaResponse = Readonly<{
  adultoMayor: unknown;
  atenciones: readonly unknown[];
}>;

type AlimentacionLookupResponse = Readonly<{
  adultoMayor: unknown;
  existingRecordId: string | null;
}>;

export function mockAuthLoginSuccess(user: AuthSessionUser) {
  return http.post(AUTH_LOGIN_ENDPOINT, () => HttpResponse.json({ user }));
}

export function mockAuthLoginFailure(status = 401, message = "Unauthorized") {
  return http.post(AUTH_LOGIN_ENDPOINT, () => HttpResponse.json({ message }, { status }));
}

export function mockAtencionesHistoriaClinica(response: HistoriaClinicaResponse) {
  return http.get(ATENCIONES_HISTORY_ENDPOINT, () => HttpResponse.json(response));
}

export function mockAtencionesMedicalHistoriaClinica(response: HistoriaClinicaResponse) {
  return http.get(ATENCIONES_MEDICAL_HISTORY_ENDPOINT, () => HttpResponse.json(response));
}

export function mockActividadDiligenciamiento(response: Record<string, unknown>) {
  return http.get(ACTIVIDADES_DILIGENCIAMIENTO_ENDPOINT, () => HttpResponse.json(response));
}

export function mockAlimentacionLookup(response: AlimentacionLookupResponse) {
  return http.get(ALIMENTACION_LOOKUP_ENDPOINT, () => HttpResponse.json(response));
}
