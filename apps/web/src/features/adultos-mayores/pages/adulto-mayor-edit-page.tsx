import { ChevronLeft, History } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AdultoMayorForm } from "../components/adulto-mayor-form";
import { AdultoMayorStatusHistory } from "../components/adulto-mayor-status-history";
import { resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import { ADULTOS_MAYORES_PATH } from "../lib/adultos-mayores-paths";
import {
  useAdultoMayorQuery,
  useAdultoMayorStatusHistoryQuery,
  useUpdateAdultoMayorMutation,
  useDeleteAdultoMayorDocumentMutation,
  useUploadAdultoMayorDocumentMutation,
} from "../model/adultos-mayores-queries";

type AdultoMayorEditPageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function AdultoMayorEditPage({ adultoMayorId, navigate }: AdultoMayorEditPageProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const adultoMayorQuery = useAdultoMayorQuery(adultoMayorId);
  const statusHistoryQuery = useAdultoMayorStatusHistoryQuery(
    adultoMayorId,
    adultoMayorQuery.data !== undefined && isHistoryOpen,
  );
  const updateMutation = useUpdateAdultoMayorMutation(adultoMayorId);
  const uploadDocumentMutation = useUploadAdultoMayorDocumentMutation(adultoMayorId);
  const deleteDocumentMutation = useDeleteAdultoMayorDocumentMutation(adultoMayorId);

  if (adultoMayorQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">Adultos mayores</p>
        <h2>Cargando adulto mayor...</h2>
      </section>
    );
  }

  if (adultoMayorQuery.isError || adultoMayorQuery.data === undefined) {
    return (
      <section className="adultos-empty" aria-labelledby="adulto-detail-error-title">
        <p className="eyebrow">Adultos mayores</p>
        <h2 id="adulto-detail-error-title">No fue posible cargar el adulto mayor</h2>
        <p className="form-error" role="alert">
          {resolveAdultosMayoresApiError(adultoMayorQuery.error)}
        </p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="adultos-form-stack" aria-labelledby="adulto-edit-title">
      <h1 className="visually-hidden" id="adulto-edit-title">
        Editar adulto mayor
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <button
          className="outline-action adultos-history-action"
          type="button"
          onClick={() => setIsHistoryOpen(true)}
        >
          <History aria-hidden="true" />
          <span>Historial</span>
        </button>
        <span className="adultos-form-nav__context">
          {adultoMayorQuery.data.names} {adultoMayorQuery.data.surnames}
        </span>
      </div>

      <AdultoMayorForm
        mode="edit"
        detail={adultoMayorQuery.data}
        isPending={updateMutation.isPending}
        error={resolveAdultosMayoresApiError(updateMutation.error)}
        onCancel={() => navigate(ADULTOS_MAYORES_PATH)}
        onDeleteDocument={async () => {
          await deleteDocumentMutation.mutateAsync();
          toast.success("PDF eliminado.");
        }}
        onSubmit={async (values, documentFile) => {
          await updateMutation.mutateAsync(values);
          if (documentFile !== null) {
            await uploadDocumentMutation.mutateAsync(documentFile);
          }
          toast.success("Cambios guardados.");
        }}
      />
      {isHistoryOpen ? (
        <AdultoMayorStatusHistory
          entries={statusHistoryQuery.data?.entries ?? []}
          isLoading={statusHistoryQuery.isLoading}
          error={
            statusHistoryQuery.isError
              ? resolveAdultosMayoresApiError(statusHistoryQuery.error)
              : null
          }
          onClose={() => setIsHistoryOpen(false)}
        />
      ) : null}
    </section>
  );
}
