function generateUuidV4(): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.getRandomValues !== "function") {
    throw new Error(
      "El navegador no admite generación segura de identificadores.",
    );
  }

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));

  // UUID versión 4 y variante RFC 4122.
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hexadecimal = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  );

  return [
    hexadecimal.slice(0, 4).join(""),
    hexadecimal.slice(4, 6).join(""),
    hexadecimal.slice(6, 8).join(""),
    hexadecimal.slice(8, 10).join(""),
    hexadecimal.slice(10, 16).join(""),
  ].join("-");
}

if (typeof globalThis.crypto?.randomUUID !== "function") {
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: generateUuidV4,
  });
}
