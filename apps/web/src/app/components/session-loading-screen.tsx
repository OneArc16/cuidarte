import { BrandLockup } from "./brand-lockup";

export function SessionLoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="login-card login-card--loading" aria-busy="true">
        <BrandLockup />
        <p className="auth-loading__title">Validando sesion...</p>
      </section>
    </main>
  );
}
