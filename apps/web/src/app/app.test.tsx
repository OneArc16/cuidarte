import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
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

    expect(await screen.findByRole("heading", { name: authUserFixture.fullName })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
    expect(window.localStorage.getItem("cuidarte.login.email")).toBe("admin@centro-demo.test");
    expect(screen.getByText(/admin@centro-demo.test/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cuenta activa" })).toBeInTheDocument();

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
});
