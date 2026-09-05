import "./polyfills/crypto-random-uuid";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/app";
import { AppErrorBoundary } from "./app/components/app-error-boundary";
import { AppProviders } from "./app/providers";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("No se encontro el elemento root de la aplicacion.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
