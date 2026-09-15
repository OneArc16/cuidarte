import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Toaster } from "sonner";

import { ReportDownloadDialog } from "@/features/reports/components/report-download-dialog";
import { ReportDownloadsProvider } from "@/features/reports/model/report-downloads-context";

import { createQueryClient } from "./query-client";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ReportDownloadsProvider>
        {children}
        <ReportDownloadDialog />
        <Toaster closeButton position="top-right" richColors toastOptions={{ duration: 3500 }} />
      </ReportDownloadsProvider>
    </QueryClientProvider>
  );
}
