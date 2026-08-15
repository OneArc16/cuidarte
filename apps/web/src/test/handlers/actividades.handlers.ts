import { http, HttpResponse } from "msw";

import {
  actividadGrupalDiligenciamientoFixture,
  actividadGrupalFixture,
  actividadGrupalFormOptionsFixture,
  actividadGrupalIntegranteFixture,
  actividadGrupalTrashFixture,
  adultoMayorFixture,
  backofficeTenantDetailFixture,
} from "../fixtures";
import { readFormDataPayload } from "../helpers/msw-request.helpers";

export const actividadesHandlers = [
  http.get("http://localhost:3001/api/actividades-grupales", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
    const activityType = new URL(request.url).searchParams.get("activityType");
    const actividades = [actividadGrupalFixture].filter((actividad) => {
      const matchesSearch =
        search === null ||
        [
          String(actividad.actaNumber),
          actividad.activityName,
          actividad.activityType,
          actividad.organizer,
        ].some((value) => value.toLowerCase().includes(search));
      const matchesActivityType =
        activityType === null || activityType === "" || actividad.activityType === activityType;

      return matchesSearch && matchesActivityType;
    });

    return HttpResponse.json({ actividadesGrupales: actividades });
  }),
  http.get("http://localhost:3001/api/actividades-grupales/papelera", ({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
    const activityType = new URL(request.url).searchParams.get("activityType");
    const actividades = [actividadGrupalTrashFixture].filter((actividad) => {
      const matchesSearch =
        search === null ||
        [
          String(actividad.actaNumber),
          actividad.activityName,
          actividad.activityType,
          actividad.organizer,
          actividad.deletedByUserFullName,
        ].some((value) => value.toLowerCase().includes(search));
      const matchesActivityType =
        activityType === null || activityType === "" || actividad.activityType === activityType;

      return matchesSearch && matchesActivityType;
    });

    return HttpResponse.json({ actividadesGrupales: actividades });
  }),
  http.get("http://localhost:3001/api/actividades-grupales/tenant-options", () =>
    HttpResponse.json({ tenants: [backofficeTenantDetailFixture.tenant] }),
  ),
  http.get("http://localhost:3001/api/actividades-grupales/form-options", () =>
    HttpResponse.json(actividadGrupalFormOptionsFixture),
  ),
  http.post("http://localhost:3001/api/actividades-grupales", () =>
    HttpResponse.json(actividadGrupalFixture),
  ),
  http.post("http://localhost:3001/api/actividades-grupales/:activityId/restaurar", () =>
    HttpResponse.json({ success: true }),
  ),
  http.get("http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento", () =>
    HttpResponse.json(actividadGrupalDiligenciamientoFixture),
  ),
  http.get(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/integrantes-options",
    ({ request }) => {
      const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
      const integrantes = [actividadGrupalIntegranteFixture].filter((integrante) =>
        [integrante.documentNumber, integrante.fullName].join(" ").toLowerCase().includes(search),
      );

      return HttpResponse.json({ integrantes });
    },
  ),
  http.put(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento",
    async ({ request }) => {
      const formData = await request.formData();
      const payload = readFormDataPayload(formData);
      const photoFiles = formData.getAll("photos");
      const pdfFile = formData.get("pdf");

      return HttpResponse.json({
        ...actividadGrupalDiligenciamientoFixture,
        objectives: payload.objectives ?? "",
        development: payload.development ?? "",
        conclusion: payload.conclusion ?? "",
        responsibleDepartment: payload.responsibleDepartment ?? null,
        integrantes:
          Array.isArray(payload.integranteIds) &&
          payload.integranteIds.includes(adultoMayorFixture.id)
            ? [actividadGrupalIntegranteFixture]
            : [],
        photoFiles:
          photoFiles.length === 0
            ? actividadGrupalDiligenciamientoFixture.photoFiles
            : photoFiles.map((file, index) => ({
                id: `123e4567-e89b-42d3-a456-4266141740${String(index + 1).padStart(2, "0")}`,
                kind: "support_photo",
                originalName: file instanceof File ? file.name : `foto-${index + 1}.jpg`,
                mimeType: file instanceof File ? file.type : "image/jpeg",
                sizeBytes: file instanceof File ? file.size : 1024,
                createdAt: "2026-04-24T12:00:00.000Z",
              })),
        pdfFile:
          pdfFile instanceof File
            ? {
                id: "223e4567-e89b-42d3-a456-426614174099",
                kind: "support_pdf",
                originalName: pdfFile.name,
                mimeType: pdfFile.type,
                sizeBytes: pdfFile.size,
                createdAt: "2026-04-24T12:00:00.000Z",
              }
            : actividadGrupalDiligenciamientoFixture.pdfFile,
        diligenciamientoCreatedAt: "2026-04-24T12:00:00.000Z",
        diligenciamientoUpdatedAt: "2026-04-24T12:00:00.000Z",
      });
    },
  ),
  http.get(
    "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/files/:fileId",
    ({ params }) => {
      const isPdf = String(params.fileId).includes("pdf");

      return new HttpResponse(isPdf ? "pdf" : "image", {
        headers: {
          "Content-Type": isPdf ? "application/pdf" : "image/webp",
        },
      });
    },
  ),
] as const;
