export function openBlobInNewTab(blob: Blob): void {
  if (typeof URL.createObjectURL !== "function" || typeof window.open !== "function") {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const openedWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");

  if (openedWindow === null) {
    URL.revokeObjectURL(objectUrl);
    return;
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 60_000);
}
