import { type HealthResponse, healthResponseSchema } from "@cuidarte/contracts";

const DEFAULT_API_URL = "http://localhost:3001/api";

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiBaseUrl()}/health`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}.`);
  }

  const data: unknown = await response.json();

  return healthResponseSchema.parse(data);
}
