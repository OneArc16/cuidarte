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

describe("App actividades trash flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the trash from the activities list and shows trashed actas", async () => {
    server.use(mockAuthMe(authUserFixture));

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    await user.click(await screen.findByRole("button", { name: "Ver papelera" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades/papelera");
    });

    expect(await screen.findByRole("heading", { name: "Papelera de actas" })).toBeInTheDocument();
    expect(await screen.findByText(actividadGrupalTrashFixture.activityName)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Restaurar acta ${actividadGrupalTrashFixture.actaNumber}`,
      }),
    ).toBeInTheDocument();
  });

  it("restores an acta from the trash and refreshes the list", async () => {
    let trashActivities = [actividadGrupalTrashFixture];
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/papelera", ({ request }) => {
        const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? null;
        const activityType = new URL(request.url).searchParams.get("activityType");
        const organizer = new URL(request.url).searchParams.get("organizer");

        return HttpResponse.json({
          actividadesGrupales: trashActivities.filter((actividad) => {
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
      http.post("http://localhost:3001/api/actividades-grupales/:activityId/restaurar", () => {
        trashActivities = [];

        return HttpResponse.json({ success: true });
      }),
    );

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades/papelera");

    await user.click(
      await screen.findByRole("button", {
        name: `Restaurar acta ${actividadGrupalTrashFixture.actaNumber}`,
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Restaurar acta" }));

    await waitFor(() => {
      expect(screen.getByText("No hay actas en la papelera.")).toBeInTheDocument();
    });
  });

  it("redirects auditors away from the trash", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/creacion-actividades/papelera");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
  });
});
