import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { useSessionStorageState } from "@/shared/hooks/use-session-storage-state";

import { NutricionAdultosTable } from "../components/nutricion-adultos-table";
import { NutricionToolbar } from "../components/nutricion-toolbar";
import { resolveNutricionApiError } from "../lib/nutricion-formatters";
import {
  buildNutricionAttentionCreatePath,
  buildNutricionHistoryPath,
} from "../lib/nutricion-paths";
import { canCreateNutricion } from "../lib/nutricion-permissions";
import { useNutricionAdultosMayoresQuery } from "../model/nutricion-queries";

type NutricionIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

const ADULTOS_MAYORES_PAGE_SIZE = 20;

export function NutricionIndexPage({ navigate, user }: NutricionIndexPageProps) {
  const [search, setSearch] = useSessionStorageState(`cuidarte:nutricion:search:${user.id}`);
  const [storedCurrentPage, setStoredCurrentPage] = useSessionStorageState<string>(
    `cuidarte:nutricion:page:${user.id}`,
    "1",
  );
  const parsedCurrentPage = Number.parseInt(storedCurrentPage, 10);
  const currentPage =
    Number.isSafeInteger(parsedCurrentPage) && parsedCurrentPage > 0 ? parsedCurrentPage : 1;
  const query = useNutricionAdultosMayoresQuery({
    search,
    page: currentPage,
    pageSize: ADULTOS_MAYORES_PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / ADULTOS_MAYORES_PAGE_SIZE));
  const canCreateAttention = canCreateNutricion(user);

  function setCurrentPage(page: number) {
    setStoredCurrentPage(String(Math.max(1, page)));
  }

  useEffect(() => {
    if (query.data !== undefined && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, query.data, totalPages]);

  return (
    <section className="nutricion-stack" aria-labelledby="nutricion-title">
      <h1 className="visually-hidden" id="nutricion-title">
        Planes y seguimiento nutricional
      </h1>

      <NutricionToolbar
        search={search}
        canClearFilters={search.trim() !== ""}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onClearFilters={() => {
          setSearch("");
          setCurrentPage(1);
        }}
      />

      {query.isError ? (
        <p className="form-error" role="alert">
          {resolveNutricionApiError(query.error)}
        </p>
      ) : null}

      <NutricionAdultosTable
        adultosMayores={query.data?.adultosMayores ?? []}
        canCreateAttention={canCreateAttention}
        isLoading={query.isLoading}
        isUpdating={query.isPlaceholderData}
        showTenantColumn={user.role === "super_admin"}
        onOpenAttention={(adultoMayorId) =>
          navigate(buildNutricionAttentionCreatePath(adultoMayorId))
        }
        onOpenHistory={(adultoMayorId) => navigate(buildNutricionHistoryPath(adultoMayorId))}
      />

      {query.data !== undefined && totalPages > 1 ? (
        <nav className="nutricion-pagination" aria-label="Paginación de adultos mayores">
          <button
            className="outline-action nutricion-pagination__button"
            type="button"
            aria-label="Página anterior"
            data-tooltip="Página anterior"
            disabled={currentPage === 1 || query.isFetching}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="nutricion-pagination__page" aria-live="polite">
            <span className="visually-hidden">Página </span>
            {currentPage}
          </span>
          <button
            className="outline-action nutricion-pagination__button"
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
