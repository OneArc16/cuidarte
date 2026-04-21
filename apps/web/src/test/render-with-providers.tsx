import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement } from "react";

import { createQueryClient } from "../app/query-client";

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const queryClient = createQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options,
  );
}
