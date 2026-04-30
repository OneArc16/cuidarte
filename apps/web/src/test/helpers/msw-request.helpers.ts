type JsonRecord = Record<string, unknown>;

function extractPayloadObject(value: unknown): JsonRecord {
  if (
    typeof value === "object" &&
    value !== null &&
    "payload" in value &&
    typeof (value as { payload?: unknown }).payload === "object" &&
    (value as { payload?: unknown }).payload !== null
  ) {
    return (value as { payload: JsonRecord }).payload;
  }

  if (typeof value === "object" && value !== null) {
    return value as JsonRecord;
  }

  return {};
}

export async function readRequestPayload(request: Request): Promise<JsonRecord> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const rawBody = await request.text();

    if (rawBody.trim() === "") {
      return {};
    }

    try {
      const parsedBody = JSON.parse(rawBody) as unknown;

      return extractPayloadObject(parsedBody);
    } catch {
      return {};
    }
  }

  const formData = await request.formData();

  return readFormDataPayload(formData);
}

export function readFormDataPayload(formData: FormData): JsonRecord {
  const rawPayload = formData.get("payload");

  if (typeof rawPayload !== "string") {
    return {};
  }

  try {
    const parsedPayload = JSON.parse(rawPayload) as unknown;

    return extractPayloadObject(parsedPayload);
  } catch {
    return {};
  }
}
