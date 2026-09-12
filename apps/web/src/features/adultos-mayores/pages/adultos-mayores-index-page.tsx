import { type AdultoMayorListItem, type AuthUser } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { useSessionStorageState } from "@/shared/hooks/use-session-storage-state";
import { buildAtencionIndividualCreatePath } from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import { buildHistoriaClinicaPath } from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import { canManageAlimentacion } from "@/features/alimentacion/lib/alimentacion-permissions";
import { buildAlimentacionCreateFromAdultoPath } from "@/features/alimentacion/lib/alimentacion-paths";
import {
  canCreateAtencionIndividual,
  canOpenHistoriaClinica,
} from "@/features/atenciones-individuales/lib/historia-clinica-permissions";
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

export function AdultosMayoresIndexPage({ navigate, user }: AdultosMayoresIndexPageProps) {
  const [search, setSearch] = useSessionStorageState(`cuidarte:adultos-mayores:search:${user.id}`);
  const [exportTarget, setExportTarget] = useState<ExportTarget>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [adultoMayorPendingTrash, setAdultoMayorPendingTrash] =
    useState<AdultoMayorListItem | null>(null);
  const adultosMayoresQuery = useAdultosMayoresQuery({ search });
  const adultosMayores = adultosMayoresQuery.data?.adultosMayores ?? [];
  const showTenantColumn = user.role === "super_admin";
  const canManageRecords = canManageAdultosMayores(user);
  const canCreateClinicalAttention = canCreateAtencionIndividual(user);
  const hideAtencionIndividualAction = user.role === "enfermeria";
  const canOpenClinicalHistory = canOpenHistoriaClinica(user);
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
          ? await exportAdultosMayoresExcel(search)
          : await exportAdultosMayoresPdf(search);

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
        isExporting={exportTarget !== null}
        onSearchChange={setSearch}
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
        canManageAlimentacion={canCreateFeedingRecord}
        isLoading={adultosMayoresQuery.isLoading}
        showTenantColumn={showTenantColumn}
        canCreateAtencionIndividual={canCreateClinicalAttention}
        canManageAdultosMayores={canManageRecords}
        canManageTrash={canManageTrash}
        canOpenHistoriaClinica={canOpenClinicalHistory}
        hideAtencionIndividualAction={hideAtencionIndividualAction}
        onOpenAlimentacion={(adultoMayorId) =>
          navigate(buildAlimentacionCreateFromAdultoPath(adultoMayorId))
        }
        onOpenAtencionIndividual={(adultoMayorId) =>
          navigate(buildAtencionIndividualCreatePath(adultoMayorId))
        }
        onOpenHistoriaClinica={(adultoMayorId) => navigate(buildHistoriaClinicaPath(adultoMayorId))}
        onEdit={(adultoMayorId) => navigate(buildAdultoMayorEditPath(adultoMayorId))}
        onSendToTrash={(adultoMayor) => {
          sendToTrashMutation.reset();
          setAdultoMayorPendingTrash(adultoMayor);
        }}
      />

      {canManageRecords ? (
        <button
          className="adultos-floating-action"
          type="button"
          aria-label="Crear adulto mayor"
          title="Crear adulto mayor"
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
