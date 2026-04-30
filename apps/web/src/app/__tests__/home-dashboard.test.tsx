import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { authUserFixture, homeDashboardFixture } from "../../test/fixtures";
import { loginAsAdmin } from "../../test/helpers/auth-test.helpers";
import { renderApp, resetAppTestState } from "../../test/helpers/app-test.helpers";

describe("App home dashboard", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows shortcut cards and dashboard indicators on the home screen", async () => {
    const user = userEvent.setup();

    const { container } = renderApp();

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await loginAsAdmin(user);

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();

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
    expect(
      within(shortcutsRegion).queryByRole("button", { name: "BackOffice" }),
    ).not.toBeInTheDocument();
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
