import { type ErrorInfo, type ReactNode, Component } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary", error, errorInfo);
  }

  render() {
    if (this.state.error !== null) {
      return (
        <main className="auth-shell">
          <section className="login-card" role="alert" aria-live="assertive">
            <p className="eyebrow">Aplicacion</p>
            <h2>No pudimos cargar esta pantalla</h2>
            <p>
              {this.state.error.message || "Ocurrio un error inesperado en el cliente."}
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
