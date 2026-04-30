import { http, HttpResponse } from "msw";

import { homeDashboardFixture } from "../fixtures";

export const homeHandlers = [
  http.get("http://localhost:3001/api/home/dashboard", () =>
    HttpResponse.json(homeDashboardFixture),
  ),
] as const;
