import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { App } from "./app";
import { renderWithProviders } from "../test/render-with-providers";
import { authUserFixture, server } from "../test/test-server";

describe("App auth routing", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/");
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
    await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));

    expect(await screen.findByRole("heading", { name: authUserFixture.fullName })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/home");
    });
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
