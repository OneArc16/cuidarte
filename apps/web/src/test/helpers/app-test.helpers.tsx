import { App } from "@/app/app";

import { renderWithProviders } from "../render-with-providers";

export function resetAppTestState(path = "/"): void {
  window.history.replaceState({}, "", path);
  window.localStorage.clear();
}

export function setAppPath(path: string): void {
  window.history.replaceState({}, "", path);
}

export function renderApp() {
  return renderWithProviders(<App />);
}

export function renderAppAtPath(path: string) {
  setAppPath(path);
  return renderApp();
}
