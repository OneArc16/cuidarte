import { expect, test } from "@playwright/test";

const adminCredentials = {
  email: "admin@centro-demo.test",
  password: "Cuidarte123!",
};

const superAdminCredentials = {
  email: "superadmin@cuidarte.test",
  password: "Cuidarte123!",
};

test.describe("Auth + Login", () => {
  test("permite iniciar sesion, llegar al home y cerrar sesion", async ({ page }) => {
    await page.goto("/login");

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

    await expect(page).toHaveURL(/\/home$/);
    await expect(
      page.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Modulos principales" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin Centro Demo" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Usuario logueado" })).toContainText("Admin");
    await expect(page.getByRole("button", { name: "Adultos mayores" })).toBeVisible();
    await expect(page.getByRole("button", { name: "BackOffice" })).toBeHidden();
    await expect(page.getByText("Asignada por admin")).toBeVisible();

    await page.goto("/backoffice");
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: "BackOffice" })).toBeHidden();

    const logoutResponsePromise = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/auth/logout") && response.request().method() === "POST",
    );

    await page.getByRole("button", { name: "Cerrar sesion" }).click();

    const logoutResponse = await logoutResponsePromise;
    expect(logoutResponse.status()).toBe(200);

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(
      page.getByRole("complementary", { name: "Menu principal de CuidarTe" }),
    ).toBeHidden();
  });

  test("permite a SuperAdmin crear y editar un tenant con propietario", async ({ page }) => {
    const runId = Date.now();
    const tenantName = `Centro E2E ${runId}`;
    const editedTenantName = `Centro E2E Editado ${runId}`;
    const ownerEmail = `propietario-${runId}@centro-e2e.test`;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(superAdminCredentials.email);
    await page.getByLabel("Contrasena").fill(superAdminCredentials.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("button", { name: "BackOffice" })).toBeVisible();

    await page.getByRole("button", { name: "BackOffice" }).click();
    await expect(page).toHaveURL(/\/backoffice$/);
    await expect(page.locator(".backoffice-heading")).toHaveCount(0);
    await expect(page.getByRole("table")).toBeVisible();

    const newTenantButton = page.getByRole("button", { name: "Nuevo tenant" });

    await expect(newTenantButton).toBeVisible();
    await expect(newTenantButton).toHaveClass(/backoffice-floating-action/);
    await newTenantButton.click();
    await expect(page).toHaveURL(/\/backoffice\/tenants\/new$/);
    await expect(page.locator(".backoffice-topbar")).toHaveCount(0);
    await expect(page.locator(".backoffice-form-nav .backoffice-back-action")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Volver" })).toHaveClass(
      /backoffice-back-action/,
    );

    await page.getByLabel("Nombre del centro").fill(tenantName);
    await page.getByLabel("Número de documento").fill(`90${runId}`);
    await page.getByLabel("Correo del centro").fill(`contacto-${runId}@centro-e2e.test`);
    await page.getByLabel("Teléfono").fill("6015558899");
    await page.getByLabel("Dirección").fill("Calle 45 # 67-89");
    await page.getByLabel("Ciudad").fill("Cali");
    await page.getByLabel("Departamento").fill("Valle del Cauca");
    await page.getByLabel("Nombre completo").fill("Propietario E2E");
    await page.getByLabel("Correo de acceso").fill(ownerEmail);
    await page.getByLabel("Contraseña inicial").fill("Cuidarte123!");
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page).toHaveURL(/\/backoffice\/tenants\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: tenantName })).toBeVisible();

    await page.getByLabel("Nombre del centro").fill(editedTenantName);
    await page.getByRole("button", { name: "Guardar" }).click();

    await expect(page.getByRole("status")).toContainText("Cambios guardados.");
    await expect(page.getByRole("heading", { name: editedTenantName })).toBeVisible();
  });

  test("permite a un admin crear y diligenciar una actividad grupal", async ({ page }) => {
    const runId = Date.now();
    const activityName = `Actividad E2E ${runId}`;

    await page.goto("/login");
    await page.getByLabel("Correo").fill(adminCredentials.email);
    await page.getByLabel("Contrasena").fill(adminCredentials.password);
    await page.getByRole("button", { name: "Iniciar sesion" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await page.getByRole("button", { name: "Sesiones grupales" }).click();
    await expect(page).toHaveURL(/\/creacion-actividades$/);
    await expect(page.getByRole("table")).toBeVisible();

    await page.getByRole("button", { name: "Crear actividad" }).click();
    await expect(page).toHaveURL(/\/creacion-actividades\/new$/);

    await page.getByLabel("Nombre de la actividad").fill(activityName);
    await page.getByLabel("Fecha de la actividad").fill("2026-04-24");
    await page.getByLabel("Hora de inicio").fill("09:00");
    await page.getByLabel("Hora final").fill("11:00");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Guardar actividad" }).click();

    await expect(page).toHaveURL(/\/creacion-actividades$/);
    await expect(page.getByText(activityName)).toBeVisible();

    await page.getByRole("button", { name: `Diligenciar actividad ${activityName}` }).click();
    await expect(page).toHaveURL(/\/creacion-actividades\/[0-9a-f-]+\/diligenciamiento$/);

    await page.getByLabel("Objetivos").fill("Objetivos E2E");
    await page.getByLabel("Desarrollo").fill("Desarrollo E2E");
    await page.getByLabel("Conclusion").fill("Conclusion E2E");
    await page.getByLabel("Departamento encargado").selectOption("fisioterapia");
    await page.getByLabel("Buscar por nombre o documento").fill("Rosa");
    await page.getByRole("button", { name: /Rosa/i }).click();
    await page.getByLabel("Agregar fotos de soporte").setInputFiles({
      name: "evidencia.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("photo"),
    });
    await page.getByLabel("Adjuntar documento PDF").setInputFiles({
      name: "soporte.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("pdf"),
    });
    await page.getByRole("button", { name: "Guardar diligenciamiento" }).click();

    await expect(page.getByRole("status")).toContainText("Diligenciamiento guardado.");
  });
});
