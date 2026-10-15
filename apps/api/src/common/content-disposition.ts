export type ContentDispositionType = "attachment" | "inline";

export function buildContentDisposition(
  disposition: ContentDispositionType,
  filename: string,
): string {
  const trimmedFilename = filename.trim() || "documento";

  const asciiFilename = trimmedFilename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\u0000-\u001F\u007F"\\]/g, "_");

  const encodedFilename = encodeURIComponent(trimmedFilename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${disposition}; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}
