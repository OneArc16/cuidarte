import { type HealthResponse, healthResponseSchema } from "@cuidarte/contracts";

import { getApiBaseUrl } from "../../../shared/api/api-config";

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
