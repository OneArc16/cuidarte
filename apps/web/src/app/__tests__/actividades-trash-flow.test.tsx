import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  actividadGrupalTrashFixture,
  authUserFixture,
  auditorUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

describe("App actividades deletion log flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the deletion log from the activities list and shows deleted actas", async () => {
    server.use(mockAuthMe(authUserFixture));

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    await user.click(await screen.findByRole("button", { name: "Ver log de eliminaciones" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades/log-eliminaciones");
    });

    expect(
      await screen.findByRole("heading", { name: "Log de eliminaciones" }),
    ).toBeInTheDocument();
    expect(await screen.findByText(actividadGrupalTrashFixture.activityName)).toBeInTheDocument();
    expect(screen.getByText("Registro duplicado")).toBeInTheDocument();
  });

  it("shows an empty deletion log", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-eliminaciones", ({ request }) => {
        const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
        const activityType = new URL(request.url).searchParams.get("activityType");
        const organizer = new URL(request.url).searchParams.get("organizer");

        return HttpResponse.json({
          actividadesGrupales: [actividadGrupalTrashFixture].filter((actividad) => {
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
              activityType === null ||
              activityType === "" ||
              actividad.activityType === activityType;
            const matchesOrganizer =
              organizer === null || organizer === "" || actividad.organizer === organizer;

            return matchesSearch && matchesActivityType && matchesOrganizer;
          }),
        });
      }),
    );

    renderAppAtPath("/creacion-actividades/log-eliminaciones");

    expect(await screen.findByText(actividadGrupalTrashFixture.activityName)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar/i })).not.toBeInTheDocument();
  });

  it("redirects auditors away from the trash", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/creacion-actividades/log-eliminaciones");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
  });
});
