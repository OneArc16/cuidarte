const REMEMBERED_EMAIL_STORAGE_KEY = "cuidarte.login.email";

export function readRememberedEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function rememberEmail(email: string) {
  const normalizedEmail = email.trim();

  if (normalizedEmail === "") {
    forgetRememberedEmail();
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, normalizedEmail);
  } catch {
    return;
  }
}

export function forgetRememberedEmail() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
  } catch {
    return;
  }
}
