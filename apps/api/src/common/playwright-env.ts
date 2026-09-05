import { existsSync } from "node:fs";
import path from "node:path";

const PLAYWRIGHT_LIB_PATHS = [
  path.resolve(process.cwd(), ".local", "playwright-libs", "usr", "lib", "x86_64-linux-gnu"),
  path.resolve(
    process.cwd(),
    ".local",
    "playwright-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
    "nss",
  ),
  path.resolve(
    process.cwd(),
    "..",
    ".local",
    "playwright-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
  ),
  path.resolve(
    process.cwd(),
    "..",
    ".local",
    "playwright-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
    "nss",
  ),
  path.resolve(
    process.cwd(),
    "..",
    "..",
    ".local",
    "playwright-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
  ),
  path.resolve(
    process.cwd(),
    "..",
    "..",
    ".local",
    "playwright-libs",
    "usr",
    "lib",
    "x86_64-linux-gnu",
    "nss",
  ),
];

export function createPlaywrightLaunchEnv(): NodeJS.ProcessEnv {
  const existingLibraryPath = process.env.LD_LIBRARY_PATH ?? "";
  const libraryPath = PLAYWRIGHT_LIB_PATHS.filter((candidate) => candidateExists(candidate));
  const mergedLibraryPath = [...libraryPath, existingLibraryPath]
    .filter((value) => value.trim() !== "")
    .join(":");

  return mergedLibraryPath === ""
    ? process.env
    : {
        ...process.env,
        LD_LIBRARY_PATH: mergedLibraryPath,
      };
}

function candidateExists(candidatePath: string): boolean {
  return path.isAbsolute(candidatePath) && existsSync(candidatePath);
}

export default {
  createPlaywrightLaunchEnv,
};
