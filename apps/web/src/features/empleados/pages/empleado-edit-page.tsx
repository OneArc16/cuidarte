import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { EmpleadoDirectorSignaturePanel } from "../components/empleado-director-signature-panel";
import { EmpleadoForm } from "../components/empleado-form";
import { EMPLEADOS_PATH } from "../lib/empleados-paths";
import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import { useEmpleadoQuery, useUpdateEmpleadoMutation } from "../model/empleados-queries";

type EmpleadoEditPageProps = {
  empleadoId: string;
  navigate: Navigate;
  user: AuthUser;
};

export function EmpleadoEditPage({ empleadoId, navigate, user }: EmpleadoEditPageProps) {
  const empleadoQuery = useEmpleadoQuery(empleadoId);
  const updateMutation = useUpdateEmpleadoMutation(empleadoId);

  if (empleadoQuery.isLoading) {
    return (
      <section className="empleados-empty" aria-busy="true">
        <p className="eyebrow">Gestion de empleados</p>
        <h2>Cargando usuario...</h2>
      </section>
    );
  }

  if (empleadoQuery.isError || empleadoQuery.data === undefined) {
    return (
      <section className="empleados-empty" aria-labelledby="empleado-detail-error-title">
        <p className="eyebrow">Gestion de empleados</p>
        <h2 id="empleado-detail-error-title">No fue posible cargar el usuario</h2>
        <p className="form-error" role="alert">
          {resolveEmpleadosApiError(empleadoQuery.error)}
        </p>
        <button className="outline-action" type="button" onClick={() => navigate(EMPLEADOS_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="empleados-form-stack" aria-labelledby="empleado-edit-title">
      <h1 className="visually-hidden" id="empleado-edit-title">
        Editar usuario
      </h1>

      <div className="empleados-form-nav">
        <button
          className="outline-action empleados-back-action"
          type="button"
          onClick={() => navigate(EMPLEADOS_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="empleados-form-nav__context">{empleadoQuery.data.fullName}</span>
      </div>

      <EmpleadoForm
        mode="edit"
        currentUserRole={user.role}
        detail={empleadoQuery.data}
        isPending={updateMutation.isPending}
        error={resolveEmpleadosApiError(updateMutation.error)}
        onCancel={() => navigate(EMPLEADOS_PATH)}
        onSubmit={(values) => {
          updateMutation.mutate(values, {
            onSuccess: () => {
              toast.success("Cambios guardados.");
            },
          });
        }}
      />

      <EmpleadoDirectorSignaturePanel detail={empleadoQuery.data} />
    </section>
  );
}
