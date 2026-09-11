import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionesEnfermeriaAdultosTable } from "../components/atenciones-enfermeria-adultos-table";
import { AtencionesEnfermeriaToolbar } from "../components/atenciones-enfermeria-toolbar";
import { resolveAtencionesEnfermeriaApiError } from "../lib/atenciones-enfermeria-formatters";
import {
  buildAtencionEnfermeriaCreatePath,
  buildAtencionesEnfermeriaHistoryPath,
} from "../lib/atenciones-enfermeria-paths";
import { canCreateAtencionesEnfermeria } from "../lib/atenciones-enfermeria-permissions";
import { useAtencionesEnfermeriaAdultosMayoresQuery } from "../model/atenciones-enfermeria-queries";
import { resolveAdultosMayoresApiError } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
import { useSessionStorageState } from "@/shared/hooks/use-session-storage-state";

type AtencionesEnfermeriaIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function AtencionesEnfermeriaIndexPage({
  navigate,
  user,
}: AtencionesEnfermeriaIndexPageProps) {
  const [search, setSearch] = useSessionStorageState(
    `cuidarte:atenciones-enfermeria:search:${user.id}`,
  );

  const query = useAtencionesEnfermeriaAdultosMayoresQuery(search);
  const adultosMayores = query.data?.adultosMayores ?? [];
  const showTenantColumn = user.role === "super_admin";
  const canCreateAtencion = canCreateAtencionesEnfermeria(user);
  const hasFilters = search.trim() !== "";

  return (
    <section className="atenciones-enfermeria-stack" aria-labelledby="atenciones-enfermeria-title">
      <h1 className="visually-hidden" id="atenciones-enfermeria-title">
        Adultos mayores disponibles para enfermería
      </h1>

      <AtencionesEnfermeriaToolbar
        search={search}
        onSearchChange={setSearch}
        onClearFilters={() => {
          setSearch("");
        }}
        canClearFilters={hasFilters}
      />

      {query.isError ? (
        <p className="form-error" role="alert">
          {resolveAdultosMayoresApiError(query.error) ??
            resolveAtencionesEnfermeriaApiError(query.error)}
        </p>
      ) : null}

      <AtencionesEnfermeriaAdultosTable
        adultosMayores={adultosMayores}
        canCreateAtencion={canCreateAtencion}
        isLoading={query.isLoading}
        showTenantColumn={showTenantColumn}
        onOpenAtencion={(adultoMayorId) => {
          navigate(buildAtencionEnfermeriaCreatePath(adultoMayorId));
        }}
        onOpenHistory={(adultoMayorId) => {
          navigate(buildAtencionesEnfermeriaHistoryPath(adultoMayorId));
        }}
      />
    </section>
  );
}
