import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  actividadGrupalDiligenciamientoFixture,
  actividadGrupalFixture,
  actividadGrupalFormOptionsFixture,
  actividadGrupalIntegranteFixture,
  authUserFixture,
  auditorUserFixture,
  empleadoFixture,
  superAdminUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { mockActividadDiligenciamiento } from "../../test/helpers/msw-domain.helpers";

type ActividadCreatePayload = {
  tenantId: string | null;
  actaNumber: string;
  activityName: string;
  activityType: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: string;
  employeeIds: string[];
};

type ActividadListItem = {
  id: string;
  tenantId: string;
  tenantName: string;
  actaNumber: string;
  activityName: string;
  activityType: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: string;
  involvedEmployeesCount: number;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: string;
  updatedAt: string;
};

describe("App actividades flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the activities list when navigating to Sesiones grupales", async () => {
    server.use(mockAuthMe(authUserFixture));
    renderAppAtPath("/creacion-actividades");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Creada el" })).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: actividadGrupalFixture.activityName }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear actividad" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Diligenciar actividad ${actividadGrupalFixture.activityName}`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Ver PDF del acta 0004`,
      }),
    ).toBeInTheDocument();
  });

  it("shows the real creation timestamp only to super admins", async () => {
    server.use(mockAuthMe(superAdminUserFixture));
    renderAppAtPath("/creacion-actividades");

    expect(await screen.findByRole("columnheader", { name: "Creada el" })).toBeInTheDocument();
    expect(
      document.querySelector(`time[datetime="${actividadGrupalFixture.createdAt}"]`),
    ).toBeInTheDocument();
  });

  it("opens the diligenciamiento page from the activities list", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      mockActividadDiligenciamiento(actividadGrupalDiligenciamientoFixture),
    );
    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    expect(
      await screen.findByRole("button", { name: actividadGrupalFixture.activityName }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: actividadGrupalFixture.activityName }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`,
      );
    });
    expect(await screen.findByText("Profesionales asignados")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue(actividadGrupalDiligenciamientoFixture.activityName),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("opens activities from other users in read-only mode", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales", () =>
        HttpResponse.json({
          actividadesGrupales: [
            {
              ...actividadGrupalFixture,
              canEdit: false,
              canDelete: false,
            },
          ],
        }),
      ),
      mockActividadDiligenciamiento({
        ...actividadGrupalDiligenciamientoFixture,
        canEdit: false,
        canDelete: false,
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    expect(
      await screen.findByRole("button", { name: "Ver actividad Jornada psicomotriz" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver actividad Jornada psicomotriz" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`,
      );
    });

    expect(await screen.findByText("Vista de solo lectura")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
  });

  it("filters the activities list by type", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "nutricion");

    await waitFor(() => {
      expect(screen.queryByText(actividadGrupalFixture.activityName)).not.toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "fisioterapia");

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
  });

  it("filters the activities list by organizer", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Organizador"), "medico");

    await waitFor(() => {
      expect(screen.queryByText(actividadGrupalFixture.activityName)).not.toBeInTheDocument();
    });

    await user.selectOptions(
      screen.getByLabelText("Organizador"),
      actividadGrupalFixture.organizer,
    );

    expect(await screen.findByText(actividadGrupalFixture.activityName)).toBeInTheDocument();
  });

  it("saves a diligenciamiento with integrantes and support files", async () => {
    let receivedContentType: string | null = null;
    let saveRequestCount = 0;
    server.use(
      mockAuthMe(authUserFixture),
      mockActividadDiligenciamiento({
        ...actividadGrupalDiligenciamientoFixture,
        objectives: "",
        development: "",
        conclusion: "",
        responsibleDepartment: null,
        integrantes: [],
        photoFiles: [],
        pdfFile: null,
      }),
      http.get(
        "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento/integrantes-options",
        () => HttpResponse.json({ integrantes: [actividadGrupalIntegranteFixture] }),
      ),
      http.put(
        "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento",
        ({ request }) => {
          receivedContentType = request.headers.get("content-type");
          saveRequestCount += 1;

          return HttpResponse.json({
            ...actividadGrupalDiligenciamientoFixture,
            objectives: "Objetivos test",
            development: "Desarrollo test",
            conclusion: "Conclusion test",
            responsibleDepartment: "nutricion",
            integrantes: [actividadGrupalIntegranteFixture],
            photoFiles: [
              {
                id: "123e4567-e89b-42d3-a456-426614174001",
                kind: "support_photo",
                originalName: "evidencia.jpg",
                mimeType: "image/jpeg",
                sizeBytes: 5120,
                createdAt: "2026-04-24T12:00:00.000Z",
              },
            ],
            pdfFile: {
              id: "223e4567-e89b-42d3-a456-426614174099",
              kind: "support_pdf",
              originalName: "soporte-final.pdf",
              mimeType: "application/pdf",
              sizeBytes: 4096,
              createdAt: "2026-04-24T12:00:00.000Z",
            },
            diligenciamientoCreatedAt: "2026-04-24T12:00:00.000Z",
            diligenciamientoUpdatedAt: "2026-04-24T12:00:00.000Z",
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath(`/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`);

    expect(await screen.findByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(
      screen.getByText("Escribe un nombre o documento para buscar adultos mayores."),
    ).toBeInTheDocument();
    await user.type(screen.getByLabelText("Objetivos"), "Objetivos test");
    await user.type(screen.getByLabelText("Desarrollo"), "Desarrollo test");
    await user.type(screen.getByLabelText("Conclusion"), "Conclusion test");
    await user.selectOptions(screen.getByLabelText("Departamento encargado"), "nutricion");
    await user.type(screen.getByLabelText("Buscar por nombre o documento"), "1020304050");
    await user.click(screen.getByRole("button", { name: /Rosa Elena Martinez Rojas/i }));
    await waitFor(() => {
      const integrantesSeleccionados = screen
        .getByText("Integrantes seleccionados")
        .closest("label");

      expect(integrantesSeleccionados).not.toBeNull();
      expect(
        within(integrantesSeleccionados as HTMLLabelElement).getByText("Rosa Elena Martinez Rojas"),
      ).toBeInTheDocument();
    });
    await user.upload(
      screen.getByLabelText("Agregar fotos de soporte"),
      new File(["photo"], "evidencia.jpg", { type: "image/jpeg" }),
    );
    await user.upload(
      screen.getByLabelText("Adjuntar documento PDF"),
      new File(["pdf"], "soporte-final.pdf", { type: "application/pdf" }),
    );
    expect(await screen.findByText("soporte-final.pdf")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(saveRequestCount).toBe(1);
    });
    expect(receivedContentType).toContain("multipart/form-data");
  });

  it("saves a diligenciamiento without integrantes", async () => {
    let receivedPayload: unknown = null;
    server.use(
      mockAuthMe(authUserFixture),
      mockActividadDiligenciamiento({
        ...actividadGrupalDiligenciamientoFixture,
        objectives: "",
        development: "",
        conclusion: "",
        responsibleDepartment: null,
        integrantes: [],
        photoFiles: [],
        pdfFile: null,
      }),
      http.put(
        "http://localhost:3001/api/actividades-grupales/:activityId/diligenciamiento",
        async ({ request }) => {
          const formData = await request.formData();
          const payload = formData.get("payload");

          receivedPayload = typeof payload === "string" ? JSON.parse(payload) : null;

          return HttpResponse.json({
            ...actividadGrupalDiligenciamientoFixture,
            objectives: "Objetivos sin asistentes",
            development: "Desarrollo sin asistentes",
            conclusion: "Conclusión sin asistentes",
            responsibleDepartment: "direccion",
            integrantes: [],
          });
        },
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath(`/creacion-actividades/${actividadGrupalFixture.id}/diligenciamiento`);

    expect(await screen.findByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByText("No hay integrantes seleccionados.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Objetivos"), "Objetivos sin asistentes");
    await user.type(screen.getByLabelText("Desarrollo"), "Desarrollo sin asistentes");
    await user.type(screen.getByLabelText("Conclusion"), "Conclusión sin asistentes");
    await user.selectOptions(screen.getByLabelText("Departamento encargado"), "direccion");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(receivedPayload).toMatchObject({ integranteIds: [] });
    });
  });

  it("creates an activity and returns to the list", async () => {
    let createPayload: ActividadCreatePayload | null = null;
    let actividades: ActividadListItem[] = [actividadGrupalFixture];
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales", () =>
        HttpResponse.json({ actividadesGrupales: actividades }),
      ),
      http.get("http://localhost:3001/api/actividades-grupales/form-options", () =>
        HttpResponse.json({
          ...actividadGrupalFormOptionsFixture,
          empleados: [
            empleadoFixture,
            { id: authUserFixture.id, fullName: authUserFixture.fullName, role: authUserFixture.role },
            { id: auditorUserFixture.id, fullName: auditorUserFixture.fullName, role: auditorUserFixture.role },
          ],
          nextActaNumber: 5,
        }),
      ),
      http.post("http://localhost:3001/api/actividades-grupales", async ({ request }) => {
        createPayload = (await request.json()) as ActividadCreatePayload;
        actividades = [
          {
            ...actividadGrupalFixture,
            id: "c6027793-39d5-4ff7-a531-65c0fd6ea24b",
            actaNumber: "0005",
            activityName: "Actividad creada desde test",
            activityType: "salud_preventiva",
            activityDate: "2026-04-24",
            startTime: "09:00",
            endTime: "11:00",
            organizer: "medico",
          },
        ];

        return HttpResponse.json(actividades[0] ?? {});
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades/new");

    await waitFor(() => {
      expect(screen.getByLabelText(/Numero de acta/i)).toHaveValue("0005");
    });
    expect(screen.queryByRole("checkbox", { name: /Admin Centro Demo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Auditor Centro Demo/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Nombre de la actividad"), "Actividad creada desde test");
    await user.selectOptions(screen.getByLabelText("Tipo de actividad"), "salud_preventiva");
    await user.type(screen.getByLabelText("Fecha de la actividad"), "2026-04-24");
    await user.type(screen.getByLabelText("Hora de inicio"), "09:00");
    await user.type(screen.getByLabelText("Hora final"), "11:00");
    await user.selectOptions(screen.getByLabelText("Organizador"), "medico");
    await user.click(screen.getByRole("checkbox", { name: /Laura Natalia Perez Ruiz/i }));
    await user.click(screen.getByRole("button", { name: "Guardar actividad" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades");
    });
    await waitFor(() => {
      expect(createPayload).not.toBeNull();
    });
    expect(await screen.findByText("Actividad creada desde test")).toBeInTheDocument();
    expect(createPayload).toMatchObject({
      tenantId: null,
      actaNumber: "0005",
      activityName: "Actividad creada desde test",
      activityType: "salud_preventiva",
      activityDate: "2026-04-24",
      startTime: "09:00",
      endTime: "11:00",
      organizer: "medico",
      employeeIds: [empleadoFixture.id],
    });
  });
});
