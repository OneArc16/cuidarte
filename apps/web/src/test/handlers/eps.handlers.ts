import { http, HttpResponse } from "msw";

import { epsFixture } from "../fixtures";

export const epsHandlers = [
  http.get("http://localhost:3001/api/eps", () => HttpResponse.json({ eps: [epsFixture] })),
] as const;
