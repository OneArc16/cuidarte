const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;

/** Where a change came from, stored alongside its audit entry. */
export type AuditRequestContext = {
  ip: string | null;
  userAgent: string | null;
};

export const EMPTY_AUDIT_REQUEST_CONTEXT: AuditRequestContext = { ip: null, userAgent: null };

type RequestLike = {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

/**
 * Reads the client IP and user agent from the request. `request.ip` already honours the
 * TRUST_PROXY setting, so a forwarded header is only used when it comes from a trusted proxy.
 */
export function resolveAuditRequestContext(request: RequestLike): AuditRequestContext {
  const rawUserAgent = request.headers["user-agent"];
  const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent.join(", ") : rawUserAgent;

  return {
    ip: normalize(request.ip, MAX_IP_LENGTH),
    userAgent: normalize(userAgent, MAX_USER_AGENT_LENGTH),
  };
}

function normalize(value: string | undefined, maxLength: number): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed === "" ? null : trimmed.slice(0, maxLength);
}
