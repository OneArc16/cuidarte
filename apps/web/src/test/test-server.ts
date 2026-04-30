import { setupServer } from "msw/node";

import { defaultHandlers } from "./handlers";

export * from "./fixtures";

export const server = setupServer(...defaultHandlers);
