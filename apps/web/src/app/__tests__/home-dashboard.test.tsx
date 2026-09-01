import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  authUserFixture,
  auditorUserFixture,
  directorUserFixture,
  homeDashboardFixture,
  medicoUserFixture,
  superAdminUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";

describe("App home dashboard", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["Admin", authUserFixture],
    ["Auditor", auditorUserFixture],
    ["Director", directorUserFixture],
    ["SuperAdmin", superAdminUserFixture],
  ] as const)("shows the dashboard for %s users", async (_label, userFixture) => {
    server.use(mockAuthMe(userFixture));

    const { container } = renderAppAtPath("/home");

    expect(await screen.findByRole("heading", { name: userFixture.fullName })).toBeInTheDocument();

    await waitFor(() => {
      const shortcutsRegion = screen.getByRole("region", { name: "Módulos del sistema" });

      expect(
        within(shortcutsRegion).getByRole("button", { name: "Adultos mayores" }),
      ).toHaveTextContent("468");
      expect(
        within(shortcutsRegion).getByRole("button", { name: "Sesiones grupales" }),
      ).toHaveTextContent("469");
      expect(
        within(shortcutsRegion).getByRole("button", { name: "Registro de alimentación" }),
      ).toHaveTextContent("140");
      expect(
        within(shortcutsRegion).getByRole("button", { name: "Gestión de empleados" }),
      ).toHaveTextContent("42");
      if (userFixture.role === "super_admin") {
        expect(
          within(shortcutsRegion).getByRole("button", { name: "BackOffice" }),
        ).toHaveTextContent("12");
      } else {
        expect(
          within(shortcutsRegion).queryByRole("button", { name: "BackOffice" }),
        ).not.toBeInTheDocument();
      }
      expect(container.querySelector(".home-heading")).not.toBeInTheDocument();
      expect(container.querySelector(".home-shortcut-card__description")).not.toBeInTheDocument();
      expect(container.querySelectorAll(".home-dashboard-section__header p")).toHaveLength(0);
      expect(
        screen.queryByText("Base principal del centro y acceso a historia de seguimiento."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Accesos directos con el volumen actual de cada modulo dentro del alcance de tu sesion.",
        ),
      ).not.toBeInTheDocument();

      const indicatorsRegion = screen.getByRole("region", { name: "Resumen operativo" });

      expect(
        within(indicatorsRegion).getByRole("button", { name: "Adultos registrados" }),
      ).toHaveTextContent(String(homeDashboardFixture.indicators[0].total));
      expect(
        within(indicatorsRegion).getByRole("button", { name: "Atenciones de enfermería" }),
      ).toHaveTextContent("84");
      expect(
        within(indicatorsRegion).getByRole("button", { name: "Atenciones del médico" }),
      ).toHaveTextContent("31");
      expect(
        within(indicatorsRegion).getByRole("button", { name: "Raciones entregadas" }),
      ).toHaveTextContent("123.200");
      expect(
        within(indicatorsRegion).getByRole("button", { name: "Fisioterapia" }),
      ).toHaveTextContent("56");
      expect(container.querySelector(".home-indicator-card small")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Personas activas en seguimiento dentro del alcance actual."),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(
          "Vista consolidada con las cantidades que mas se consultan en el arranque del dia.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  it("shows direct access shortcuts for professional roles without requesting the dashboard", async () => {
    server.use(
      mockAuthMe(medicoUserFixture),
      http.get("http://localhost:3001/api/home/dashboard", () => {
        throw new Error("Home dashboard should not be requested for professional roles");
      }),
    );

    renderAppAtPath("/home");

    const accessHeading = await screen.findByRole("heading", {
      level: 2,
      name: "Accesos directos",
    });
    const workspace = accessHeading.closest(".home-workspace") as HTMLElement | null;

    if (!workspace) {
      throw new Error("Expected home workspace to be present");
    }

    expect(within(workspace).getByRole("button", { name: "Adultos mayores" })).toBeInTheDocument();
    expect(
      within(workspace).getByRole("button", { name: "Sesiones grupales" }),
    ).toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", { name: "Registro de alimentación" }),
    ).not.toBeInTheDocument();
    expect(
      within(workspace).queryByRole("button", { name: "Gestión de empleados" }),
    ).not.toBeInTheDocument();
    expect(within(workspace).queryByRole("region", { name: "Módulos del sistema" })).not.toBeInTheDocument();
    expect(within(workspace).queryByRole("region", { name: "Resumen operativo" })).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Modulos principales" })).toBeInTheDocument();
    expect(workspace.querySelector(".home-access-shortcut-card")).toBeInTheDocument();
    expect(workspace.querySelector(".home-shortcut-card__total")).not.toBeInTheDocument();
    expect(workspace).toHaveTextContent("Accesos directos");
    expect(workspace.querySelector(".home-direct-access__grid")).toBeInTheDocument();
    expect(workspace.querySelector(".home-access-shortcut-card__description")).toHaveTextContent(
      "Gestion y seguimiento",
    );
    expect(workspace.querySelector(".home-access-shortcut-card__arrow")).toBeInTheDocument();
  });

  it("navigates the nursing indicator to the nursing module", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();

    renderAppAtPath("/home");

    const indicatorsRegion = await screen.findByRole("region", { name: "Resumen operativo" });

    await user.click(
      within(indicatorsRegion).getByRole("button", { name: "Atenciones de enfermería" }),
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/atenciones-enfermeria");
    });

    expect(await screen.findByLabelText("Filtros de enfermería")).toBeInTheDocument();
  });

  it("navigates the medical attention indicator to adultos mayores", async () => {
    server.use(mockAuthMe(authUserFixture));
    const user = userEvent.setup();

    renderAppAtPath("/home");

    const indicatorsRegion = await screen.findByRole("region", { name: "Resumen operativo" });

    await user.click(
      within(indicatorsRegion).getByRole("button", { name: "Atenciones del médico" }),
    );

    await waitFor(() => {
      expect(window.location.pathname).toBe("/adultos-mayores");
    });

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("region", { name: "Adultos mayores registrados" }),
    ).toBeInTheDocument();
  });
});
