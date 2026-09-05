import { http, HttpResponse } from "msw";

import {
  atencionIndividualAdultoFixture,
  atencionIndividualFixture,
  authUserFixture,
  historiaClinicaFixture,
} from "../fixtures";
import { readRequestPayload } from "../helpers/msw-request.helpers";

export const atencionesHandlers = [
  http.get(
    "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/lookup",
    () =>
      HttpResponse.json({
        adultoMayor: atencionIndividualAdultoFixture,
        suggestedConsecutive: 1,
      }),
  ),
  http.get(
    "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/history",
    () => HttpResponse.json(historiaClinicaFixture),
  ),
  http.get(
    "http://localhost:3001/api/atenciones-individuales/adultos-mayores/:adultoMayorId/medical-history",
    () => HttpResponse.json(historiaClinicaFixture),
  ),
  http.post("http://localhost:3001/api/atenciones-individuales", async ({ request }) => {
    const payload = await readRequestPayload(request);

    return HttpResponse.json({
      ...atencionIndividualFixture,
      ...payload,
      id: atencionIndividualFixture.id,
      adultoMayor: atencionIndividualAdultoFixture,
      tenantId: atencionIndividualAdultoFixture.tenantId,
      tenantName: atencionIndividualAdultoFixture.tenantName,
      createdByUserId: authUserFixture.id,
      updatedByUserId: authUserFixture.id,
      createdAt: atencionIndividualFixture.createdAt,
      updatedAt: "2026-04-24T12:10:00.000Z",
    });
  }),
  http.get("http://localhost:3001/api/atenciones-individuales/:atencionId", () =>
    HttpResponse.json(atencionIndividualFixture),
  ),
  http.patch(
    "http://localhost:3001/api/atenciones-individuales/:atencionId",
    async ({ request }) => {
      const payload = await readRequestPayload(request);

      return HttpResponse.json({
        ...atencionIndividualFixture,
        ...payload,
        updatedAt: "2026-04-24T12:20:00.000Z",
      });
    },
  ),
] as const;
