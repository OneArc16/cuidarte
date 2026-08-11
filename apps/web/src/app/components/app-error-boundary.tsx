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
  override state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("AppErrorBoundary", error, errorInfo);
  }

  override render() {
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
