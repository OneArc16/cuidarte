import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AlimentacionRecordForm } from "../components/alimentacion-record-form";
import { REGISTRO_ALIMENTACION_PATH } from "../lib/alimentacion-paths";
import { resolveAlimentacionApiError } from "../lib/alimentacion-formatters";
import {
  useAlimentacionRecordQuery,
  useUpdateAlimentacionRecordMutation,
} from "../model/alimentacion-queries";

type AlimentacionEditPageProps = {
  navigate: Navigate;
  recordId: string;
};

export function AlimentacionEditPage({ navigate, recordId }: AlimentacionEditPageProps) {
  const recordQuery = useAlimentacionRecordQuery(recordId);
  const updateMutation = useUpdateAlimentacionRecordMutation(recordId);

  return (
    <section className="alimentacion-form-stack" aria-labelledby="alimentacion-edit-title">
      <h1 className="visually-hidden" id="alimentacion-edit-title">
        Editar registro de alimentación
      </h1>

      <div className="alimentacion-form-nav">
        <button
          className="outline-action alimentacion-back-action"
          type="button"
          onClick={() => navigate(REGISTRO_ALIMENTACION_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="alimentacion-form-nav__context">Editar registro</span>
      </div>

      {recordQuery.isLoading ? (
        <p role="status">Cargando registro...</p>
      ) : null}

      {recordQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAlimentacionApiError(recordQuery.error)}
        </p>
      ) : null}

      {recordQuery.data !== undefined ? (
        <AlimentacionRecordForm
          error={resolveAlimentacionApiError(updateMutation.error)}
          isPending={updateMutation.isPending}
          record={recordQuery.data}
          onCancel={() => navigate(REGISTRO_ALIMENTACION_PATH)}
          onSubmit={(request) => {
            updateMutation.mutate(request, {
              onSuccess: () => {
                navigate(REGISTRO_ALIMENTACION_PATH);
              },
            });
          }}
        />
      ) : null}
    </section>
  );
}
