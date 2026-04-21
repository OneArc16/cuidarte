import {
  authSessionSchema,
  logoutResponseSchema,
  meResponseSchema,
  type AuthSession,
  type LoginRequest,
  type LogoutResponse,
  type MeResponse,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "../../../shared/api/api-config";
import { fetchJson } from "../../../shared/api/fetch-json";

export function login(request: LoginRequest): Promise<AuthSession> {
  return fetchJson(`${getApiBaseUrl()}/auth/login`, authSessionSchema, {
    method: "POST",
    body: request,
  });
}

export function getMe(): Promise<MeResponse> {
  return fetchJson(`${getApiBaseUrl()}/auth/me`, meResponseSchema);
}

export function logout(): Promise<LogoutResponse> {
  return fetchJson(`${getApiBaseUrl()}/auth/logout`, logoutResponseSchema, {
    method: "POST",
  });
}
