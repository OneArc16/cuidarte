import { ApiError } from "./api-error";

export async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      Accept: "*/*",
    },
  });

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  return response.blob();
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
    return "No fue posible completar la descarga.";
  }

  return "No fue posible completar la descarga.";
}
