const DEFAULT_API_URL = "/api";

export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}
