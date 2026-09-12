import { type AdultoMayorTrashListItem, type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, RotateCcw, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ADULTOS_MAYORES_PATH } from "../lib/adultos-mayores-paths";
import { formatAdultoMayorDocument, resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import { canManageAdultosMayoresTrash } from "../lib/adultos-mayores-permissions";
import { useAdultosMayoresTrashQuery, useRestoreAdultoMayorMutation } from "../model/adultos-mayores-queries";

type AdultosMayoresTrashPageProps = { navigate: Navigate; user: AuthUser };

export function AdultosMayoresTrashPage({ navigate, user }: AdultosMayoresTrashPageProps) {
  const [search, setSearch] = useState("");
  const canManageTrash = canManageAdultosMayoresTrash(user);
  const trashQuery = useAdultosMayoresTrashQuery({ search }, canManageTrash);
  const restoreMutation = useRestoreAdultoMayorMutation();

  if (!canManageTrash) return null;

  function restore(adultoMayor: AdultoMayorTrashListItem) {
    restoreMutation.mutate(adultoMayor.id, {
      onSuccess: () => toast.success("Adulto mayor restaurado."),
    });
  }

  return (
    <section className="adultos-stack" aria-label="Papelera de adultos mayores">
      <button className="outline-action" type="button" aria-label="Volver al listado" onClick={() => navigate(ADULTOS_MAYORES_PATH)}>
        <ChevronLeft aria-hidden="true" />
      </button>

      <label className="adultos-search adultos-trash-search">
        <span>Buscar en papelera</span>
        <div className="adultos-search__control"><Search aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Documento, nombre o centro" /></div>
      </label>

      {trashQuery.isError ? <p className="form-error" role="alert">{resolveAdultosMayoresApiError(trashQuery.error)}</p> : null}
      {restoreMutation.isError ? <p className="form-error" role="alert">{resolveAdultosMayoresApiError(restoreMutation.error)}</p> : null}

      <div className="adultos-table-wrap">
        <table className="adultos-table adultos-trash-table">
          <thead><tr><th>Centro</th><th>Documento</th><th>Nombre</th><th>Motivo</th><th>Eliminado por</th><th>Fecha</th><th><span className="visually-hidden">Acciones</span></th></tr></thead>
          <tbody>
            {trashQuery.isLoading ? <tr><td colSpan={7}>Cargando papelera...</td></tr> : null}
            {!trashQuery.isLoading && (trashQuery.data?.adultosMayores.length ?? 0) === 0 ? <tr><td colSpan={7}>No hay adultos mayores en la papelera.</td></tr> : null}
            {trashQuery.data?.adultosMayores.map((adultoMayor) => (
              <tr key={adultoMayor.id}>
                <td>{adultoMayor.tenantName}</td><td>{formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}</td><td><strong>{adultoMayor.names} {adultoMayor.surnames}</strong></td><td>{adultoMayor.deletionReason}</td><td>{adultoMayor.deletedByUserFullName}</td><td>{new Date(adultoMayor.deletedAt).toLocaleString("es-CO")}</td>
                <td><button className="adultos-row-action" type="button" aria-label={`Restaurar ${adultoMayor.names} ${adultoMayor.surnames}`} disabled={restoreMutation.isPending} onClick={() => restore(adultoMayor)}><RotateCcw aria-hidden="true" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
