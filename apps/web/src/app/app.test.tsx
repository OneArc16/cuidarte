import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { authUserFixture } from "../test/fixtures";
import { loginWithCredentials, submitLogin } from "../test/helpers/auth-test.helpers";
import { renderApp, resetAppTestState } from "../test/helpers/app-test.helpers";
import { expectBaseModules } from "../test/helpers/navigation-test.helpers";

describe("App smoke routing", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects a signed-in user to home and logs out back to login", async () => {
    const user = userEvent.setup();

    renderApp();

    expect(await screen.findByRole("heading", { name: "Bienvenido" })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });

    await loginWithCredentials(user, {
      email: "admin@centro-demo.test",
      password: "Cuidarte123!",
    });
    await user.click(screen.getByLabelText("Recordar contrasena"));
    await submitLogin(user);

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
    expect(loggedUser).toHaveTextContent("Admin");
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
});
