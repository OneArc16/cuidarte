import { http, HttpResponse } from "msw";

import { departmentFixture, municipalityFixture } from "../fixtures";

export const ubicacionesHandlers = [
  http.get("http://localhost:3001/api/ubicaciones/departments", () =>
    HttpResponse.json({ departments: [departmentFixture] }),
  ),
  http.get(
    "http://localhost:3001/api/ubicaciones/departments/:departmentId/municipalities",
    ({ params }) => {
      if (params.departmentId !== departmentFixture.id) {
        return HttpResponse.json({ municipalities: [] });
      }

      return HttpResponse.json({ municipalities: [municipalityFixture] });
    },
  ),
] as const;
