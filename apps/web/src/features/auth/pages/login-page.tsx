import { useEffect, useState } from "react";

import { LoginForm } from "../components/login-form";

const SLOGAN_ROTATION_INTERVAL_MS = 4200;
const LOGIN_SLOGANS = [
  "Porque cada día importa.",
  "Salud, alegría y bienestar en un solo lugar.",
  "Cuidamos a quienes más quieres.",
  "Tu bienestar, nuestra misión.",
] as const;

type LoginPageProps = {
  onAuthenticated: () => void;
};

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Centro de Vida</p>
          <h1>CuidarTe</h1>
          <RotatingSlogan slogans={LOGIN_SLOGANS} />
          <div className="hero__signature" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="auth-layout" aria-label="Acceso a CuidarTe">
        <section className="login-card" aria-label="Formulario de inicio de sesion">
          <div className="login-card__header">
            <p className="eyebrow">Ingreso</p>
            <h2>Bienvenido</h2>
            <p>Usa el correo y contrasena asignados por el administrador.</p>
          </div>
          <LoginForm onAuthenticated={onAuthenticated} />
        </section>
      </section>
    </main>
  );
}

type RotatingSloganProps = {
  slogans: readonly [string, ...string[]];
};

function RotatingSlogan({ slogans }: RotatingSloganProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlogan = slogans[activeIndex] ?? slogans[0];

  useEffect(() => {
    if (slogans.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slogans.length);
    }, SLOGAN_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slogans]);

  return (
    <p className="hero__slogan" aria-live="polite" key={activeSlogan}>
      {activeSlogan}
    </p>
  );
}
