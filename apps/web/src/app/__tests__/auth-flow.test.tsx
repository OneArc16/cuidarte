import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";

import { server } from "../../test/test-server";
import { renderApp, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthLoginFailure } from "../../test/helpers/msw-domain.helpers";
import { authUserFixture } from "../../test/fixtures";

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

  it("closes an idle session and explains why on the login screen", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let isSessionActive = true;
    let logoutCalls = 0;
    let activityCalls = 0;

    server.use(
      http.get("http://localhost:3001/api/auth/me", () =>
        HttpResponse.json({
          user: isSessionActive ? authUserFixture : null,
          idleTimeoutSeconds: 30 * 60,
        }),
      ),
      http.post("http://localhost:3001/api/auth/activity", () => {
        activityCalls += 1;
        return HttpResponse.json({ success: true });
      }),
      http.post("http://localhost:3001/api/auth/logout", () => {
        logoutCalls += 1;
        isSessionActive = false;
        return HttpResponse.json({ success: true });
      }),
    );

    renderApp();

    await waitFor(() => expect(activityCalls).toBe(1));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(28 * 60 * 1000);
    });
    expect(
      screen.getByRole("alertdialog", { name: "Tu sesión está por cerrarse" }),
    ).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    });

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Tu sesión se cerró por inactividad. Ingresa de nuevo para continuar.",
    );
    expect(logoutCalls).toBe(1);
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
