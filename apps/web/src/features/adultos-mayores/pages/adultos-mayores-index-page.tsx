import {
  type AdultoMayorAttentionFilter,
  type AdultoMayorListItem,
  type AuthUser,
} from "@cuidarte/contracts";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { useSessionStorageState } from "@/shared/hooks/use-session-storage-state";
import {
  buildAtencionIndividualCreatePath,
  buildHistoriaClinicaPath,
  buildHistoriaMedicaPath,
} from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import { canManageAlimentacion } from "@/features/alimentacion/lib/alimentacion-permissions";
import { buildAlimentacionCreateFromAdultoPath } from "@/features/alimentacion/lib/alimentacion-paths";
import {
  canCreateAtencionIndividual,
  canOpenHistoriaClinica,
  canOpenHistoriaMedica,
} from "@/features/atenciones-individuales/lib/historia-clinica-permissions";
import { buildAtencionesEnfermeriaHistoryPath } from "@/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths";
import { canReadHistoriaEnfermeria } from "@/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions";
import {
  canManageAdultosMayores,
  canManageAdultosMayoresTrash,
} from "../lib/adultos-mayores-permissions";

import { AdultosMayoresTable } from "../components/adultos-mayores-table";
import { AdultosMayoresToolbar } from "../components/adultos-mayores-toolbar";
import { exportAdultosMayoresExcel, exportAdultosMayoresPdf } from "../api/adultos-mayores-api";
import { downloadBlob } from "../lib/download-file";
import { resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import {
  ADULTOS_MAYORES_IMPORT_PATH,
  ADULTOS_MAYORES_NEW_PATH,
  ADULTOS_MAYORES_TRASH_PATH,
  buildAdultoMayorEditPath,
} from "../lib/adultos-mayores-paths";
import {
  useAdultosMayoresQuery,
  useSendAdultoMayorToTrashMutation,
} from "../model/adultos-mayores-queries";
import { openBlobInNewTab } from "@/shared/lib/open-blob-in-new-tab";
import { canImportAdultosMayores } from "../lib/adultos-mayores-permissions";
import { AdultoMayorTrashDialog } from "../components/adulto-mayor-trash-dialog";

type AdultosMayoresIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

type ExportTarget = "excel" | "pdf" | null;
const ADULTOS_MAYORES_PAGE_SIZE = 20;

export function AdultosMayoresIndexPage({ navigate, user }: AdultosMayoresIndexPageProps) {
  const [search, setSearch] = useSessionStorageState(`cuidarte:adultos-mayores:search:${user.id}`);
  const [attentionType, setAttentionType] = useSessionStorageState<AdultoMayorAttentionFilter>(
    `cuidarte:adultos-mayores:attention-type:${user.id}`,
    "all",
  );
  const [storedCurrentPage, setStoredCurrentPage] = useSessionStorageState<string>(
    `cuidarte:adultos-mayores:page:${user.id}`,
    "1",
  );
  const parsedCurrentPage = Number.parseInt(storedCurrentPage, 10);
  const currentPage =
    Number.isSafeInteger(parsedCurrentPage) && parsedCurrentPage > 0 ? parsedCurrentPage : 1;
  const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [adultoMayorPendingTrash, setAdultoMayorPendingTrash] =
    useState<AdultoMayorListItem | null>(null);
  const adultosMayoresQuery = useAdultosMayoresQuery({
    search,
    attentionType,
    page: currentPage,
    pageSize: ADULTOS_MAYORES_PAGE_SIZE,
  });
  const adultosMayores = adultosMayoresQuery.data?.adultosMayores ?? [];
  const totalPages = Math.max(
    1,
    Math.ceil((adultosMayoresQuery.data?.total ?? 0) / ADULTOS_MAYORES_PAGE_SIZE),
  );

  function setCurrentPage(page: number) {
    setStoredCurrentPage(String(Math.max(1, page)));
  }

  useEffect(() => {
    if (adultosMayoresQuery.data !== undefined && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [adultosMayoresQuery.data, currentPage, totalPages]);
  const showTenantColumn = user.role === "super_admin";
  const canManageRecords = canManageAdultosMayores(user);
  const canCreateClinicalAttention = canCreateAtencionIndividual(user);
  const hideAtencionIndividualAction = user.role === "enfermeria";
  const canOpenClinicalHistory = canOpenHistoriaClinica(user);
  const canOpenMedicalHistory = canOpenHistoriaMedica(user);
  const canOpenNursingHistory = canReadHistoriaEnfermeria(user);
  const canCreateFeedingRecord = canManageAlimentacion(user);
  const canImportRecords = canImportAdultosMayores(user);
  const canManageTrash = canManageAdultosMayoresTrash(user);
  const sendToTrashMutation = useSendAdultoMayorToTrashMutation();

  async function handleExportExcel() {
    await exportFile("excel");
  }

  async function handleExportPdf() {
    await exportFile("pdf");
  }

  async function exportFile(target: Exclude<ExportTarget, null>) {
    setExportTarget(target);
    setExportError(null);

    try {
      const blob =
        target === "excel"
          ? await exportAdultosMayoresExcel({ search, attentionType })
          : await exportAdultosMayoresPdf({ search, attentionType });

      if (target === "excel") {
        downloadBlob(blob, "adultos-mayores.xlsx");
      } else {
        openBlobInNewTab(blob);
      }
    } catch (error: unknown) {
      setExportError(resolveAdultosMayoresApiError(error));
    } finally {
      setExportTarget(null);
    }
  }

  return (
    <section className="adultos-stack" aria-labelledby="adultos-mayores-title">
      <h1 className="visually-hidden" id="adultos-mayores-title">
        Listado de adultos mayores
      </h1>

      <AdultosMayoresToolbar
        canImportAdultosMayores={canImportRecords}
        canManageTrash={canManageTrash}
        search={search}
        attentionType={attentionType}
        isExporting={exportTarget !== null}
        onSearchChange={(value) => {
          setSearch(value);
          setCurrentPage(1);
        }}
        onAttentionTypeChange={(value) => {
          setAttentionType(value);
          setCurrentPage(1);
        }}
        onImportAdultosMayores={() => navigate(ADULTOS_MAYORES_IMPORT_PATH)}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        onPrint={() => window.print()}
        onOpenTrash={() => navigate(ADULTOS_MAYORES_TRASH_PATH)}
      />

      {adultosMayoresQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAdultosMayoresApiError(adultosMayoresQuery.error)}
        </p>
      ) : null}

      {exportError !== null ? (
        <p className="form-error" role="alert">
          {exportError}
        </p>
      ) : null}

      <AdultosMayoresTable
        adultosMayores={adultosMayores}
        attentionType={attentionType}
        canManageAlimentacion={canCreateFeedingRecord}
        isLoading={adultosMayoresQuery.isLoading}
        isUpdating={adultosMayoresQuery.isPlaceholderData}
        showTenantColumn={showTenantColumn}
        canCreateAtencionIndividual={canCreateClinicalAttention}
        canManageAdultosMayores={canManageRecords}
        canManageTrash={canManageTrash}
        canOpenHistoriaClinica={canOpenClinicalHistory}
        canOpenHistoriaMedica={canOpenMedicalHistory}
        canOpenHistoriaEnfermeria={canOpenNursingHistory}
        hideAtencionIndividualAction={hideAtencionIndividualAction}
        onOpenAlimentacion={(adultoMayorId) =>
          navigate(buildAlimentacionCreateFromAdultoPath(adultoMayorId))
        }
        onOpenAtencionIndividual={(adultoMayorId) =>
          navigate(buildAtencionIndividualCreatePath(adultoMayorId))
        }
        onOpenHistoriaClinica={(adultoMayorId) => navigate(buildHistoriaClinicaPath(adultoMayorId))}
        onOpenHistoriaEnfermeria={(adultoMayorId) =>
          navigate(buildAtencionesEnfermeriaHistoryPath(adultoMayorId))
        }
        onOpenHistoriaMedica={(adultoMayorId) => navigate(buildHistoriaMedicaPath(adultoMayorId))}
        onEdit={(adultoMayorId) => navigate(buildAdultoMayorEditPath(adultoMayorId))}
        onSendToTrash={(adultoMayor) => {
          sendToTrashMutation.reset();
          setAdultoMayorPendingTrash(adultoMayor);
        }}
      />

      {adultosMayoresQuery.data !== undefined && totalPages > 1 ? (
        <nav className="adultos-pagination" aria-label="Paginación de adultos mayores">
          <button
            className="outline-action adultos-pagination__button"
            type="button"
            aria-label="Página anterior"
            data-tooltip="Página anterior"
            disabled={currentPage === 1 || adultosMayoresQuery.isFetching}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="adultos-pagination__page" aria-live="polite">
            <span className="visually-hidden">Página </span>
            {currentPage}
          </span>
          <button
            className="outline-action adultos-pagination__button"
            type="button"
            aria-label="Página siguiente"
            data-tooltip="Página siguiente"
            disabled={currentPage === totalPages || adultosMayoresQuery.isFetching}
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}

      {canManageRecords ? (
        <button
          className="adultos-floating-action"
          type="button"
          aria-label="Crear adulto mayor"
          data-tooltip="Crear adulto mayor"
          onClick={() => navigate(ADULTOS_MAYORES_NEW_PATH)}
        >
          <Plus aria-hidden="true" />
        </button>
      ) : null}

      {adultoMayorPendingTrash !== null ? (
        <AdultoMayorTrashDialog
          adultoMayor={adultoMayorPendingTrash}
          errorMessage={resolveAdultosMayoresApiError(sendToTrashMutation.error)}
          isPending={sendToTrashMutation.isPending}
          onClose={() => {
            if (!sendToTrashMutation.isPending) {
              sendToTrashMutation.reset();
              setAdultoMayorPendingTrash(null);
            }
          }}
          onConfirm={(reason) => {
            sendToTrashMutation.mutate(
              { adultoMayorId: adultoMayorPendingTrash.id, reason },
              {
                onSuccess: () => {
                  sendToTrashMutation.reset();
                  setAdultoMayorPendingTrash(null);
                },
              },
            );
          }}
        />
      ) : null}
    </section>
  );
}
