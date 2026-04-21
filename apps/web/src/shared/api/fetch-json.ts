import { type ZodSchema } from "zod";

import { ApiError } from "./api-error";

type FetchJsonOptions = {
  method?: "GET" | "POST";
  body?: unknown;
};

export async function fetchJson<T>(
  url: string,
  schema: ZodSchema<T>,
  options: FetchJsonOptions = {},
): Promise<T> {
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers:
      options.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
  };

  if (options.body !== undefined) {
    requestInit.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    throw new ApiError("No fue posible completar la solicitud.", response.status);
  }

  const data: unknown = await response.json();

  return schema.parse(data);
}
