import { ChevronLeft, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { type AuthUser } from "@cuidarte/contracts";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionEnfermeriaDeleteDialog } from "../components/atencion-enfermeria-delete-dialog";
import { AtencionesEnfermeriaHistoryTable } from "../components/atenciones-enfermeria-history-table";
import { resolveAtencionesEnfermeriaApiError } from "../lib/atenciones-enfermeria-formatters";
import {
  ATENCIONES_ENFERMERIA_PATH,
  buildAtencionEnfermeriaDetailPath,
} from "../lib/atenciones-enfermeria-paths";
import {
  useAtencionesEnfermeriaHistoryQuery,
  useAtencionesEnfermeriaTrashQuery,
  useDeleteAtencionEnfermeriaMutation,
  useRestoreAtencionEnfermeriaMutation,
} from "../model/atenciones-enfermeria-queries";

type AtencionesEnfermeriaHistoryPageProps = {
  adultoMayorId: string;
  navigate: Navigate;
  user: AuthUser;
};

export function AtencionesEnfermeriaHistoryPage({
  adultoMayorId,
  navigate,
  user,
}: AtencionesEnfermeriaHistoryPageProps) {
  const canManageTrash = ["super_admin", "admin", "director"].includes(user.role);
  const [showTrash, setShowTrash] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const historyQuery = useAtencionesEnfermeriaHistoryQuery(adultoMayorId);
  const trashQuery = useAtencionesEnfermeriaTrashQuery(adultoMayorId, canManageTrash && showTrash);
  const deleteMutation = useDeleteAtencionEnfermeriaMutation();
  const restoreMutation = useRestoreAtencionEnfermeriaMutation();

  if (historyQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">Historia de enfermería</p>
        <h2>Cargando historia de enfermería...</h2>
      </section>
    );
  }

  if (historyQuery.isError || historyQuery.data === undefined) {
    return (
      <section
        className="adultos-empty"
        aria-labelledby="atenciones-enfermeria-history-error-title"
      >
        <p className="eyebrow">Historia de enfermería</p>
        <h2 id="atenciones-enfermeria-history-error-title">No fue posible cargar la historia</h2>
        <p>{resolveAtencionesEnfermeriaApiError(historyQuery.error)}</p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const { adultoMayor } = historyQuery.data;
  const atenciones = showTrash ? (trashQuery.data?.atenciones ?? []) : historyQuery.data.atenciones;

  return (
    <section className="adultos-form-stack" aria-labelledby="atenciones-enfermeria-history-title">
      <h1 className="visually-hidden" id="atenciones-enfermeria-history-title">
        Historia de enfermería del adulto mayor
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>

        <span className="adultos-form-nav__context">Historia de enfermería</span>
      </div>

      <section className="atencion-patient-summary" aria-label="Resumen del adulto mayor">
        <div>
          <span className="eyebrow">Historia compartida</span>
          <h2>{adultoMayor.fullName}</h2>
        </div>
        <dl>
          <div>
            <dt>Documento</dt>
            <dd>{adultoMayor.documentNumber}</dd>
          </div>
          <div>
            <dt>Edad</dt>
            <dd>{adultoMayor.age}</dd>
          </div>
          <div>
            <dt>Centro</dt>
            <dd>{adultoMayor.tenantName}</dd>
          </div>
          <div>
            <dt>EPS</dt>
            <dd>{adultoMayor.eps ?? "Sin dato"}</dd>
          </div>
        </dl>
      </section>

      <div className="atencion-history-header">
        <div>
          <span className="eyebrow">Atenciones registradas</span>
        </div>
        {canManageTrash ? (
          <button
            className="outline-action atencion-history-trash-toggle"
            type="button"
            aria-label={showTrash ? "Ver atenciones activas" : "Abrir papelera"}
            title={showTrash ? "Ver atenciones activas" : "Abrir papelera"}
            onClick={() => setShowTrash((value) => !value)}
          >
            {showTrash ? <RotateCcw aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            <span className="visually-hidden">{showTrash ? "Ver activas" : "Papelera"}</span>
          </button>
        ) : null}
      </div>

      <AtencionesEnfermeriaHistoryTable
        atenciones={atenciones}
        isLoading={showTrash ? trashQuery.isLoading : false}
        isTrash={showTrash}
        canManageTrash={canManageTrash}
        onDelete={(atencionId) => setPendingDeleteId(atencionId)}
        onRestore={async (atencionId) => {
          await restoreMutation.mutateAsync(atencionId);
          toast.success("Atención restaurada.");
        }}
        onOpenAtencion={(atencionId) => {
          navigate(buildAtencionEnfermeriaDetailPath(atencionId));
        }}
      />

      {pendingDeleteId !== null ? (
        <AtencionEnfermeriaDeleteDialog
          isPending={deleteMutation.isPending}
          onClose={() => setPendingDeleteId(null)}
          onConfirm={() => {
            void deleteMutation
              .mutateAsync(pendingDeleteId)
              .then(() => {
                setPendingDeleteId(null);
                toast.success("Atención enviada a la papelera.");
              })
              .catch((error: unknown) => {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "No fue posible enviar la atención a la papelera.",
                );
              });
          }}
        />
      ) : null}
    </section>
  );
}
