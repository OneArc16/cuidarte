import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  actividadGrupalChangeLogFixture,
  authUserFixture,
  auditorUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

describe("App actividades change log flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the change log and shows an edition with its before and after values", async () => {
    server.use(mockAuthMe(authUserFixture));

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades");

    await user.click(await screen.findByRole("button", { name: "Ver historial de cambios" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/creacion-actividades/log-cambios");
    });

    expect(
      await screen.findByRole("heading", { name: "Historial de cambios" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(actividadGrupalChangeLogFixture.activityName),
    ).toBeInTheDocument();
    expect(screen.getByText("Antes: 09:30")).toBeInTheDocument();
    expect(screen.getByText("Después: 10:00")).toBeInTheDocument();
  });

  it("shows the change log", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-cambios", () =>
        HttpResponse.json({ entries: [actividadGrupalChangeLogFixture], nextCursor: null }),
      ),
    );

    renderAppAtPath("/creacion-actividades/log-eliminaciones");

    expect(
      await screen.findByText(actividadGrupalChangeLogFixture.activityName),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar/i })).not.toBeInTheDocument();
  });

  it("loads the next history page without adding entries to the current view", async () => {
    const cursors: Array<string | null> = [];
    const secondEntry = {
      ...actividadGrupalChangeLogFixture,
      id: "723e4567-e89b-42d3-a456-426614174000",
      activityName: "Sesión de seguimiento",
    };

    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-cambios", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        cursors.push(cursor);

        return HttpResponse.json(
          cursor === null
            ? { entries: [actividadGrupalChangeLogFixture], nextCursor: "next-page" }
            : { entries: [secondEntry], nextCursor: null },
        );
      }),
    );

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades/log-cambios");

    expect(
      await screen.findByText(actividadGrupalChangeLogFixture.activityName),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1", { selector: ".actividades-change-log-pagination__page" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Página siguiente" }));

    expect(await screen.findByText(secondEntry.activityName)).toBeInTheDocument();
    expect(
      screen.queryByText(actividadGrupalChangeLogFixture.activityName),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("2", { selector: ".actividades-change-log-pagination__page" }),
    ).toBeInTheDocument();
    expect(cursors).toEqual([null, "next-page"]);
  });

  it("redirects auditors away from the trash", async () => {
    server.use(mockAuthMe(auditorUserFixture));

    renderAppAtPath("/creacion-actividades/log-eliminaciones");

    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
  });
});
