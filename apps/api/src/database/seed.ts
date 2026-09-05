import { seedEpsDemo } from "./seed-eps-demo";
import { seedLogin } from "./seed-login";

void seedEpsDemo()
  .then(() => seedLogin())
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
