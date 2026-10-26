import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

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

const ADULTOS_MAYORES_PAGE_SIZE = 20;

export function AtencionesEnfermeriaIndexPage({
  navigate,
  user,
}: AtencionesEnfermeriaIndexPageProps) {
  const [search, setSearch] = useSessionStorageState(
    `cuidarte:atenciones-enfermeria:search:${user.id}`,
  );
  const [storedCurrentPage, setStoredCurrentPage] = useSessionStorageState<string>(
    `cuidarte:atenciones-enfermeria:page:${user.id}`,
    "1",
  );
  const parsedCurrentPage = Number.parseInt(storedCurrentPage, 10);
  const currentPage =
    Number.isSafeInteger(parsedCurrentPage) && parsedCurrentPage > 0 ? parsedCurrentPage : 1;

  function setCurrentPage(page: number) {
    setStoredCurrentPage(String(Math.max(1, page)));
  }

  const query = useAtencionesEnfermeriaAdultosMayoresQuery({
    search,
    page: currentPage,
    pageSize: ADULTOS_MAYORES_PAGE_SIZE,
  });
  const adultosMayores = query.data?.adultosMayores ?? [];
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADULTOS_MAYORES_PAGE_SIZE));
  const showTenantColumn = user.role === "super_admin";
  const canCreateAtencion = canCreateAtencionesEnfermeria(user);
  const hasFilters = search.trim() !== "";

  useEffect(() => {
    if (query.data !== undefined && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [query.data, currentPage, totalPages]);

  return (
    <section className="atenciones-enfermeria-stack" aria-labelledby="atenciones-enfermeria-title">
      <h1 className="visually-hidden" id="atenciones-enfermeria-title">
        Adultos mayores disponibles para enfermería
      </h1>

      <AtencionesEnfermeriaToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onClearFilters={() => {
          setSearch("");
          setCurrentPage(1);
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
        isUpdating={query.isPlaceholderData}
        showTenantColumn={showTenantColumn}
        onOpenAtencion={(adultoMayorId) => {
          navigate(buildAtencionEnfermeriaCreatePath(adultoMayorId));
        }}
        onOpenHistory={(adultoMayorId) => {
          navigate(buildAtencionesEnfermeriaHistoryPath(adultoMayorId));
        }}
      />

      {query.data !== undefined && totalPages > 1 ? (
        <nav
          className="atenciones-enfermeria-pagination"
          aria-label="Paginación de adultos mayores"
        >
          <button
            className="outline-action atenciones-enfermeria-pagination__button"
            type="button"
            aria-label="Página anterior"
            data-tooltip="Página anterior"
            disabled={currentPage === 1 || query.isFetching}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="atenciones-enfermeria-pagination__page" aria-live="polite">
            <span className="visually-hidden">Página </span>
            {currentPage}
          </span>
          <button
            className="outline-action atenciones-enfermeria-pagination__button"
            type="button"
            aria-label="Página siguiente"
            data-tooltip="Página siguiente"
            disabled={currentPage === totalPages || query.isFetching}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
