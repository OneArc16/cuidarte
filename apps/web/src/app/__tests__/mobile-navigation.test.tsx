import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { authUserFixture } from "../../test/fixtures";
import { loginAsAdmin } from "../../test/helpers/auth-test.helpers";
import { renderApp, resetAppTestState } from "../../test/helpers/app-test.helpers";

describe("App mobile navigation", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses a mobile bottom navigation with a more modules sheet", async () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));
    const user = userEvent.setup();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await loginAsAdmin(user);

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).not.toBeInTheDocument();

    const mobileNavigation = screen.getByRole("navigation", { name: "Navegacion movil" });

    ["Inicio", "Adultos mayores", "Sesiones grupales"].forEach((moduleLabel) => {
      expect(
        within(mobileNavigation).getByRole("button", { name: moduleLabel }),
      ).toBeInTheDocument();
    });
    expect(
      within(mobileNavigation).queryByRole("button", { name: "Creación de actividades" }),
    ).not.toBeInTheDocument();
    expect(
      within(mobileNavigation).queryByRole("button", { name: "Registro de alimentación" }),
    ).not.toBeInTheDocument();

    const moreButton = within(mobileNavigation).getByRole("button", { name: "Más" });

    expect(moreButton).toHaveAttribute("aria-expanded", "false");
    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "true");

    const moreSheet = await screen.findByRole("dialog", { name: "Más módulos" });

    expect(
      within(moreSheet).getByRole("button", { name: "Registro de alimentación" }),
    ).toBeInTheDocument();
    expect(within(moreSheet).getByRole("button", { name: "Enfermería" })).toBeInTheDocument();
    expect(
      within(moreSheet).getByRole("button", { name: "Gestión de empleados" }),
    ).toBeInTheDocument();
    expect(within(moreSheet).queryByRole("button", { name: "BackOffice" })).not.toBeInTheDocument();
    expect(within(moreSheet).getByRole("button", { name: "Cerrar sesion" })).toBeInTheDocument();
  });
});

function createMatchMedia(matches: boolean) {
  return (query: string): MediaQueryList =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as MediaQueryList;
}
