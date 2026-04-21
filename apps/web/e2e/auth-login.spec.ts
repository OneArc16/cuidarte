import { expect, test } from "@playwright/test";

const adminCredentials = {
  email: "admin@centro-demo.test",
  password: "Cuidarte123!",
};

test.describe("Auth + Login", () => {
  test("permite iniciar sesion, ver la sesion activa y cerrar sesion", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(page.getByLabel("Correo")).toBeVisible();
    await expect(page.getByLabel("Contrasena")).toBeVisible();

    await page.getByLabel("Correo").fill(adminCredentials.email);
    await page.getByLabel("Contrasena").fill(adminCredentials.password);

    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/login") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    const loginResponse = await loginResponsePromise;
    expect(loginResponse.status()).toBe(200);

    await expect(page.getByRole("region", { name: "Sesion activa" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin Centro Demo" })).toBeVisible();
    await expect(page.getByText("admin@centro-demo.test")).toBeVisible();
    await expect(page.getByText("Asignada por admin")).toBeVisible();

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/logout") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    const logoutResponse = await logoutResponsePromise;
    expect(logoutResponse.status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Sesion activa" })).toBeHidden();
  });
});
