import { type ZodSchema } from "zod";

import { ApiError } from "./api-error";

type FetchJsonOptions = {
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  body?: FormData | unknown;
};

export async function fetchJson<T>(
  url: string,
  schema: ZodSchema<T>,
  options: FetchJsonOptions = {},
): Promise<T> {
  const isFormDataBody = options.body instanceof FormData;
  const requestInit: RequestInit = {
    method: options.method ?? "GET",
    credentials: "include",
    headers:
      options.body === undefined
        ? { Accept: "application/json" }
        : isFormDataBody
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
  };

  if (options.body !== undefined) {
    requestInit.body = isFormDataBody ? (options.body as BodyInit) : JSON.stringify(options.body);
  }

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  const data: unknown = await response.json();

  return schema.parse(data);
}

async function resolveErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      Array.isArray(data.message)
    ) {
      return data.message.join(" ");
    }
  } catch {
    return "No fue posible completar la solicitud.";
  }

  return "No fue posible completar la solicitud.";
}
