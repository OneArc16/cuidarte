import { seedLogin } from "./seed-login";

void seedLogin().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
