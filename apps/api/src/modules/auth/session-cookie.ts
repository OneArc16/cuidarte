import { type FastifyRequest } from "fastify";

import { getEnv } from "../../config/env";

export function getSessionTokenFromRequest(request: FastifyRequest): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (cookieHeader === undefined) {
    return undefined;
  }

  const cookieName = `${getEnv().SESSION_COOKIE_NAME}=`;
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookieName));

  if (cookie === undefined) {
    return undefined;
  }

  return decodeURIComponent(cookie.slice(cookieName.length));
}
