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

  it("labels the actor column and expands long changes into a full detail row", async () => {
    const longText = "Desarrollo extenso de la sesión. ".repeat(10).trim();
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-cambios", () =>
        HttpResponse.json({
          entries: [
            {
              ...actividadGrupalChangeLogFixture,
              changes: [{ field: "Desarrollo", before: null, after: longText }],
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades/log-cambios");

    expect(
      await screen.findByRole("columnheader", { name: "Modificado por" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Realizada por" })).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: "Ver detalle completo" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Cambio en Desarrollo" })).not.toBeInTheDocument();

    await user.click(toggle);

    const detail = screen.getByRole("region", { name: "Cambio en Desarrollo" });
    expect(detail).toHaveTextContent(longText);
    expect(screen.getByRole("button", { name: "Ocultar detalle" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "Ocultar detalle" }));
    expect(screen.queryByRole("region", { name: "Cambio en Desarrollo" })).not.toBeInTheDocument();
  });

  it("shows where each change came from", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-cambios", () =>
        HttpResponse.json({
          entries: [
            {
              ...actividadGrupalChangeLogFixture,
              actorIp: "190.85.12.4",
              actorUserAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            },
            {
              ...actividadGrupalChangeLogFixture,
              id: "823e4567-e89b-42d3-a456-426614174000",
              actorIp: null,
              actorUserAgent: null,
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    renderAppAtPath("/creacion-actividades/log-cambios");

    expect(await screen.findByText("IP 190.85.12.4")).toBeInTheDocument();
    expect(screen.getByText("Chrome en Windows")).toBeInTheDocument();
    expect(screen.getByText("Origen no registrado")).toBeInTheDocument();
  });

  it("filters the change log by action", async () => {
    const requestedActions: Array<string | null> = [];
    server.use(
      mockAuthMe(authUserFixture),
      http.get("http://localhost:3001/api/actividades-grupales/log-cambios", ({ request }) => {
        requestedActions.push(new URL(request.url).searchParams.get("action"));
        return HttpResponse.json({ entries: [actividadGrupalChangeLogFixture], nextCursor: null });
      }),
    );

    const user = userEvent.setup();
    renderAppAtPath("/creacion-actividades/log-cambios");

    const actionSelect = await screen.findByRole("combobox", { name: "Acción" });
    expect(actionSelect).toHaveValue("");
    await waitFor(() => expect(requestedActions[0]).toBeNull());

    await user.selectOptions(actionSelect, "Eliminación");
    await waitFor(() => expect(requestedActions.at(-1)).toBe("deleted"));

    await user.selectOptions(actionSelect, "Edición");
    await waitFor(() => expect(requestedActions.at(-1)).toBe("updated"));
  });

  it("does not offer the detail toggle for short changes", async () => {
    server.use(mockAuthMe(authUserFixture));

    renderAppAtPath("/creacion-actividades/log-cambios");

    expect(await screen.findByText("Antes: 09:30")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver detalle completo" })).not.toBeInTheDocument();
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
