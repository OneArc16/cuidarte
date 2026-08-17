import { http, HttpResponse } from "msw";

import {
  atencionEnfermeriaFixture,
  atencionEnfermeriaOtherFixture,
  atencionEnfermeriaAdultoFixture,
  atencionEnfermeriaHistoryFixture,
  atencionesEnfermeriaFixture,
} from "../fixtures";

const createdAtencionEnfermeriaFixture = {
  ...atencionEnfermeriaFixture,
  id: "9d2b7f44-2b5f-4ec2-8c58-3d3f4e7b7e21",
};

export const atencionesEnfermeriaHandlers = [
  http.get("http://localhost:3001/api/atenciones-enfermeria", ({ request }) => {
    const searchParams = new URL(request.url).searchParams;

    if (searchParams.get("search") === "sin-resultados") {
      return HttpResponse.json({ atencionesEnfermeria: [] });
    }

    return HttpResponse.json(atencionesEnfermeriaFixture);
  }),
  http.get("http://localhost:3001/api/atenciones-enfermeria/adultos-mayores/:adultoMayorId/lookup", ({ params }) => {
    if (params.adultoMayorId !== atencionEnfermeriaAdultoFixture.id) {
      return new HttpResponse(null, { status: 404 });
    }

    return HttpResponse.json({
      adultoMayor: atencionEnfermeriaAdultoFixture,
    });
  }),
  http.get(
    "http://localhost:3001/api/atenciones-enfermeria/adultos-mayores/:adultoMayorId/history",
    ({ params }) => {
      if (params.adultoMayorId !== atencionEnfermeriaAdultoFixture.id) {
        return new HttpResponse(null, { status: 404 });
      }

      return HttpResponse.json(atencionEnfermeriaHistoryFixture);
    },
  ),
  http.get("http://localhost:3001/api/atenciones-enfermeria/:atencionId", ({ params }) => {
    if (params.atencionId === atencionEnfermeriaFixture.id) {
      return HttpResponse.json(atencionEnfermeriaFixture);
    }

    if (params.atencionId === createdAtencionEnfermeriaFixture.id) {
      return HttpResponse.json(createdAtencionEnfermeriaFixture);
    }

    if (params.atencionId === atencionEnfermeriaOtherFixture.id) {
      return HttpResponse.json(atencionEnfermeriaOtherFixture);
    }

    return new HttpResponse(null, { status: 404 });
  }),
  http.post("http://localhost:3001/api/atenciones-enfermeria", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    return HttpResponse.json({
      ...createdAtencionEnfermeriaFixture,
      attentionDate: String(body.attentionDate ?? atencionEnfermeriaFixture.attentionDate),
      attentionTime: String(body.attentionTime ?? atencionEnfermeriaFixture.attentionTime),
      careType: String(body.careType ?? atencionEnfermeriaFixture.careType),
      reason: (body.reason as string | null | undefined) ?? atencionEnfermeriaFixture.reason,
      tensionSistolica:
        typeof body.tensionSistolica === "number"
          ? body.tensionSistolica
          : atencionEnfermeriaFixture.tensionSistolica,
      nursingNote: String(body.nursingNote ?? atencionEnfermeriaFixture.nursingNote),
    });
  }),
  http.patch("http://localhost:3001/api/atenciones-enfermeria/:atencionId", async ({ params, request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const source = params.atencionId === atencionEnfermeriaOtherFixture.id
      ? atencionEnfermeriaOtherFixture
      : params.atencionId === createdAtencionEnfermeriaFixture.id
        ? createdAtencionEnfermeriaFixture
      : atencionEnfermeriaFixture;

    return HttpResponse.json({
      ...source,
      attentionDate: String(body.attentionDate ?? source.attentionDate),
      attentionTime: String(body.attentionTime ?? source.attentionTime),
      careType: String(body.careType ?? source.careType),
      reason: (body.reason as string | null | undefined) ?? source.reason,
      tensionSistolica:
        typeof body.tensionSistolica === "number" ? body.tensionSistolica : source.tensionSistolica,
      nursingNote: String(body.nursingNote ?? source.nursingNote),
    });
  }),
] as const;
