const BROWSERS: Array<[RegExp, string]> = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const OPERATING_SYSTEMS: Array<[RegExp, string]> = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iPod/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** Turns a raw user agent into a short label such as "Chrome en Windows". */
export function describeUserAgent(userAgent: string | null | undefined): string | null {
  if (userAgent === null || userAgent === undefined || userAgent.trim() === "") {
    return null;
  }

  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const operatingSystem = OPERATING_SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];

  if (browser !== undefined && operatingSystem !== undefined) {
    return `${browser} en ${operatingSystem}`;
  }

  return browser ?? operatingSystem ?? "Navegador desconocido";
}
