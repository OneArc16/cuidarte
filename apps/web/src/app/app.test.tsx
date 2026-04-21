import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./app";
import { renderWithProviders } from "../test/render-with-providers";
import { authUserFixture, server } from "../test/test-server";

describe("App auth routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("rotates login slogans below the CuidarTe heading", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderWithProviders(<App />);

    expect(await screen.findByText("Porque cada día importa.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(screen.getByText("Salud, alegría y bienestar en un solo lugar.")).toBeInTheDocument();
  });

  it("shows remember password and toggles password visibility", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    const rememberPassword = screen.getByLabelText("Recordar contrasena");

    expect(rememberPassword).not.toBeChecked();
    await user.click(rememberPassword);
    expect(rememberPassword).toBeChecked();

    const passwordInput = screen.getByLabelText("Contrasena");

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Mostrar contrasena" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Ocultar contrasena" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("redirects a signed-in user to home and logs out back to login", async () => {
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });

    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByLabelText("Recordar contrasena"));
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    expect(window.localStorage.getItem("cuidarte.login.email")).toBe("admin@centro-demo.test");
    expect(
      screen.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeInTheDocument();
    const loggedUser = screen.getByRole("region", { name: "Usuario logueado" });

    expect(loggedUser).toHaveTextContent(authUserFixture.fullName);
    expect(loggedUser).toHaveTextContent("Admin de tenant");
    expect(screen.getAllByText("CuidarTe")).not.toHaveLength(0);

    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });

    expect(within(navigation).getByRole("button", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expectBaseModules(navigation);
    expect(
      within(navigation).queryByRole("button", { name: "BackOffice" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar sesion" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
    expect(screen.getByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
  });

  it("shows an accessible error when credentials are rejected", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/login", () =>
        HttpResponse.json({ message: "Unauthorized" }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.clear(screen.getByLabelText("Contrasena"));
    await user.type(screen.getByLabelText("Contrasena"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contrasena incorrectos.");
  });

  it("shows BackOffice in the sidebar for super admin users", async () => {
    server.use(
      http.post("http://localhost:3001/api/auth/login", () =>
        HttpResponse.json({
          user: {
            ...authUserFixture,
            id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
            tenantId: null,
            email: "superadmin@cuidarte.test",
            fullName: "Super Admin CuidarTe",
            role: "super_admin",
          },
        }),
      ),
    );
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo"), "superadmin@cuidarte.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: "Super Admin CuidarTe" }),
    ).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Modulos principales" });

    expectBaseModules(navigation);
    expect(within(navigation).getByRole("button", { name: "BackOffice" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Usuario logueado" })).toHaveTextContent(
      "SuperAdmin",
    );
  });

  it("uses a mobile bottom navigation with a more modules sheet", async () => {
    vi.stubGlobal("matchMedia", createMatchMedia(true));
    const user = userEvent.setup();

    renderWithProviders(<App />);

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.type(screen.getByLabelText("Contrasena"), "Cuidarte123!");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(
      await screen.findByRole("heading", { name: authUserFixture.fullName }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).not.toBeInTheDocument();

    const mobileNavigation = screen.getByRole("navigation", { name: "Navegacion movil" });

    ["Inicio", "Adultos mayores", "Sesiones grupales", "Creación de actividades"].forEach(
      (moduleLabel) => {
        expect(
          within(mobileNavigation).getByRole("button", { name: moduleLabel }),
        ).toBeInTheDocument();
      },
    );
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
    expect(
      within(moreSheet).getByRole("button", { name: "Gestión de empleados" }),
    ).toBeInTheDocument();
    expect(within(moreSheet).queryByRole("button", { name: "BackOffice" })).not.toBeInTheDocument();
    expect(within(moreSheet).getByRole("button", { name: "Cerrar sesion" })).toBeInTheDocument();
  });
});

function expectBaseModules(navigation: HTMLElement) {
  [
    "Inicio",
    "Adultos mayores",
    "Sesiones grupales",
    "Creación de actividades",
    "Registro de alimentación",
    "Gestión de empleados",
  ].forEach((moduleLabel) => {
    expect(within(navigation).getByRole("button", { name: moduleLabel })).toBeInTheDocument();
  });
}

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
