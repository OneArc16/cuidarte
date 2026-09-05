import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { enfermeriaUserFixture } from "../../test/fixtures";
import { server } from "../../test/test-server";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";

describe("App atenciones de enfermería flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows direct access for a nurse and loads the nursing listing", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));
    const user = userEvent.setup();

    renderAppAtPath("/home");

    const accessHeading = await screen.findByRole("heading", {
      level: 2,
      name: "Accesos directos",
    });
    const workspace = accessHeading.closest(".home-workspace") as HTMLElement | null;

    if (!workspace) {
      throw new Error("Expected home workspace to be present");
    }

    expect(within(workspace).getByRole("button", { name: "Enfermería" })).toBeInTheDocument();
    await user.click(within(workspace).getByRole("button", { name: "Enfermería" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/atenciones-enfermeria");
    });

    expect(await screen.findByLabelText("Filtros de enfermería")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeDisabled();
    expect(screen.getByText("CC 1020304050")).toBeInTheDocument();
    expect(screen.getByText("Rosa Elena")).toBeInTheDocument();
    expect(screen.getByText("Martinez Rojas")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Historia de enfermería de Rosa Elena Martinez Rojas`,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `Nueva atención de enfermería de Rosa Elena Martinez Rojas`,
      }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText("Buscar"), "sin-resultados");

    expect(screen.getByRole("button", { name: "Limpiar filtros" })).toBeEnabled();

    expect(
      await screen.findByText("Sin adultos mayores registrados para el filtro actual."),
    ).toBeInTheDocument();
  });

  it("loads the shared nursing history for an adult and marks own and foreign records", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));

    renderAppAtPath(`/atenciones-enfermeria/adultos-mayores/0b17e370-8f81-48c0-b707-c7046f497855/history`);

    expect(
      await screen.findByRole("heading", { name: "Rosa Elena Martinez Rojas" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Historia compartida")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acceso Editar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acceso Ver" })).toBeInTheDocument();
  });
});
