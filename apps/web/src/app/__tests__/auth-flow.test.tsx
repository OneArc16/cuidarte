import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { server } from "../../test/test-server";
import { renderApp, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthLoginFailure } from "../../test/helpers/msw-domain.helpers";

describe("App auth flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rotates login slogans below the CuidarTe heading", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    renderApp();

    expect(await screen.findByText("Porque cada día importa.")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(screen.getByText("Salud, alegría y bienestar en un solo lugar.")).toBeInTheDocument();
  });

  it("shows remember password and toggles password visibility", async () => {
    const user = userEvent.setup();

    renderApp();

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

  it("shows an accessible error when credentials are rejected", async () => {
    server.use(mockAuthLoginFailure());
    const user = userEvent.setup();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await user.clear(screen.getByLabelText("Correo"));
    await user.type(screen.getByLabelText("Correo"), "admin@centro-demo.test");
    await user.clear(screen.getByLabelText("Contrasena"));
    await user.type(screen.getByLabelText("Contrasena"), "incorrecta");
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Correo o contrasena incorrectos.");
  });
});
