import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AdultoMayorForm } from "../components/adulto-mayor-form";
import { resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import { ADULTOS_MAYORES_PATH } from "../lib/adultos-mayores-paths";
import {
  useAdultoMayorQuery,
  useUpdateAdultoMayorMutation,
} from "../model/adultos-mayores-queries";

type AdultoMayorEditPageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function AdultoMayorEditPage({ adultoMayorId, navigate }: AdultoMayorEditPageProps) {
  const adultoMayorQuery = useAdultoMayorQuery(adultoMayorId);
  const updateMutation = useUpdateAdultoMayorMutation(adultoMayorId);

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
        onSubmit={(values) => {
          updateMutation.mutate(values, {
            onSuccess: () => {
              toast.success("Cambios guardados.");
            },
          });
        }}
      />
    </section>
  );
}
