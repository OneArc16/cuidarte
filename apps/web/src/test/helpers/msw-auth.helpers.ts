import { http, HttpResponse } from "msw";

const AUTH_ME_ENDPOINT = "http://localhost:3001/api/auth/me";

export type AuthSessionUser = Readonly<{
  id: string;
  tenantId: string | null;
  email: string;
  fullName: string;
  role: string;
  passwordSetByAdmin?: boolean;
}>;

export function mockAuthMe(user: AuthSessionUser) {
  return http.get(AUTH_ME_ENDPOINT, () => HttpResponse.json({ user }));
}
