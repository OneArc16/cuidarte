import { screen } from "@testing-library/react";
import { type UserEvent } from "@testing-library/user-event";

type TestCredentials = {
  email: string;
  password: string;
};

const ADMIN_CREDENTIALS: TestCredentials = {
  email: "admin@centro-demo.test",
  password: "Cuidarte123!",
};

const SUPER_ADMIN_CREDENTIALS: TestCredentials = {
  email: "superadmin@cuidarte.test",
  password: "Cuidarte123!",
};

export async function loginWithCredentials(
  user: UserEvent,
  credentials: TestCredentials,
): Promise<void> {
  await user.type(screen.getByLabelText("Correo"), credentials.email);
  await user.type(screen.getByLabelText("Contrasena"), credentials.password);
}

export async function submitLogin(user: UserEvent): Promise<void> {
  await user.click(screen.getByRole("button", { name: "Iniciar sesion" }));
}

export async function loginAsAdmin(user: UserEvent): Promise<void> {
  await loginWithCredentials(user, ADMIN_CREDENTIALS);
  await submitLogin(user);
}

export async function loginAsSuperAdmin(user: UserEvent): Promise<void> {
  await loginWithCredentials(user, SUPER_ADMIN_CREDENTIALS);
  await submitLogin(user);
}
