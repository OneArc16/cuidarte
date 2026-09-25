import {
  type AlimentacionImportedFormatoVersion,
  type AlimentacionListItem,
  type AuthUser,
} from "@cuidarte/contracts";
import { Files, Plus } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  buildAlimentacionFormatoEntregaPdfUrl,
  buildAlimentacionImportedFormatoVersionDownloadUrl,
} from "../api/alimentacion-api";
import { AlimentacionDeleteDialog } from "../components/alimentacion-delete-dialog";
import { AlimentacionImportedPdfDialog } from "../components/alimentacion-imported-pdf-dialog";
import { AlimentacionImportedPdfVersionsDialog } from "../components/alimentacion-imported-pdf-versions-dialog";
import { AlimentacionBulkImportDialog } from "../components/alimentacion-bulk-import-dialog";
import { AlimentacionTable } from "../components/alimentacion-table";
import { AlimentacionToolbar } from "../components/alimentacion-toolbar";
import { ReportExportButton } from "@/features/reports/components/report-export-button";
import { ReportHistoryButton } from "@/features/reports/components/report-history-button";
import {
  REGISTRO_ALIMENTACION_NEW_PATH,
  buildAlimentacionEditPath,
} from "../lib/alimentacion-paths";
import { canImportAlimentacion, canManageAlimentacion } from "../lib/alimentacion-permissions";
import {
  getCurrentMonthInputValue,
  resolveAlimentacionApiError,
} from "../lib/alimentacion-formatters";
import {
  useAlimentacionListQuery,
  useAlimentacionImportedFormatoVersionsQuery,
  useAlimentacionTenantOptionsQuery,
  useDeleteAlimentacionRecordMutation,
  useImportAlimentacionFormatoEntregaMutation,
} from "../model/alimentacion-queries";

type AlimentacionIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

type ImportTarget = {
  adultoMayorId: string;
  deliveryMonth: string;
  documentNumber: string;
  fullName: string;
  hasImportedFormato: boolean;
};

type ImportDialogState = ImportTarget & {
  deliveryMonth: string;
  file: File;
};

type ImportedFormatoHistoryTarget = {
  adultoMayorId: string;
  fullName: string;
  deliveryMonth: string;
};

const MAX_IMPORTED_FORMATO_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function AlimentacionIndexPage({ navigate, user }: AlimentacionIndexPageProps) {
  const [search, setSearch] = useState("");
  const [deliveryMonth, setDeliveryMonth] = useState(getCurrentMonthInputValue());
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [exportingAdultoMayorId, setExportingAdultoMayorId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const [importDialog, setImportDialog] = useState<ImportDialogState | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ImportedFormatoHistoryTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlimentacionListItem | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [downloadingImportedVersionId, setDownloadingImportedVersionId] = useState<string | null>(
    null,
  );
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const showTenantFilter = user.role === "super_admin";
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(showTenantFilter);
  const canManageRecords = canManageAlimentacion(user);
  const canImportRecords = canImportAlimentacion(user);
  const effectiveDeliveryMonth = deliveryMonth.trim() === "" ? null : deliveryMonth;
  const reportPeriod = effectiveDeliveryMonth ?? "ALL";
  const reportTenantId = showTenantFilter
    ? selectedTenantId === ""
      ? null
      : selectedTenantId
    : user.tenantId;
  const registrosQuery = useAlimentacionListQuery({
    search,
    deliveryMonth: effectiveDeliveryMonth,
    tenantId: reportTenantId,
  });
  const importMutation = useImportAlimentacionFormatoEntregaMutation();
  const deleteMutation = useDeleteAlimentacionRecordMutation();
  const importedVersionsQuery = useAlimentacionImportedFormatoVersionsQuery(
    historyTarget?.adultoMayorId ?? null,
    historyTarget?.deliveryMonth ?? null,
    historyTarget !== null,
  );

  async function handleExportFormato(params: {
    adultoMayorId: string;
    deliveryMonth: string;
    documentNumber: string;
    fullName: string;
  }) {
    setExportingAdultoMayorId(params.adultoMayorId);
    setExportError(null);

    try {
      const pdfUrl = buildAlimentacionFormatoEntregaPdfUrl({
        adultoMayorId: params.adultoMayorId,
        deliveryMonth: params.deliveryMonth,
      });
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      setExportError(resolveAlimentacionApiError(error) ?? "No fue posible abrir el PDF.");
    } finally {
      setExportingAdultoMayorId(null);
    }
  }

  function handleRequestImport(params: ImportTarget) {
    importMutation.reset();
    setImportError(null);
    setImportTarget(params);
    importFileInputRef.current?.click();
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    event.target.value = "";

    if (file === null || importTarget === null) {
      return;
    }

    if (!isPdfFile(file)) {
      setImportError("Selecciona un archivo PDF válido.");
      return;
    }

    if (file.size === 0 || file.size > MAX_IMPORTED_FORMATO_FILE_SIZE_BYTES) {
      setImportError("El archivo PDF debe pesar entre 1 byte y 10 MiB.");
      return;
    }

    importMutation.reset();
    setImportError(null);
    setImportDialog({
      ...importTarget,
      deliveryMonth: importTarget.deliveryMonth,
      file,
    });
  }

  function closeImportDialog() {
    if (importMutation.isPending) {
      return;
    }

    importMutation.reset();
    setImportDialog(null);
    setImportTarget(null);
  }

  function confirmImport() {
    if (importDialog === null) {
      return;
    }

    importMutation.mutate(
      {
        adultoMayorId: importDialog.adultoMayorId,
        deliveryMonth: importDialog.deliveryMonth,
        file: importDialog.file,
      },
      {
        onSuccess: ({ version }) => {
          toast.success(
            `PDF importado correctamente como versión ${version.version} para ${importDialog.fullName}.`,
          );
          setImportDialog(null);
          setImportTarget(null);
        },
      },
    );
  }

  function openImportedFormatoHistory(params: {
    adultoMayorId: string;
    deliveryMonth: string;
    fullName: string;
  }) {
    setHistoryTarget(params);
  }

  async function handleDownloadImportedFormato(params: {
    adultoMayorId: string;
    versionId: string;
    originalName: string;
  }) {
    setDownloadingImportedVersionId(params.versionId);

    try {
      const pdfUrl = buildAlimentacionImportedFormatoVersionDownloadUrl({
        adultoMayorId: params.adultoMayorId,
        versionId: params.versionId,
      });

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (error: unknown) {
      toast.error(
        resolveAlimentacionApiError(error) ?? "No fue posible descargar el PDF importado.",
      );
    } finally {
      setDownloadingImportedVersionId(null);
    }
  }

  function handleHistoryDownload(version: AlimentacionImportedFormatoVersion) {
    if (historyTarget === null) {
      return;
    }

    void handleDownloadImportedFormato({
      adultoMayorId: historyTarget.adultoMayorId,
      versionId: version.id,
      originalName: version.originalName,
    });
  }

  function handleRequestDelete(record: AlimentacionListItem) {
    deleteMutation.reset();
    setDeleteTarget(record);
  }

  function closeDeleteDialog() {
    if (deleteMutation.isPending) {
      return;
    }

    deleteMutation.reset();
    setDeleteTarget(null);
  }

  function confirmDelete() {
    if (deleteTarget === null) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Registro de alimentación eliminado para ${deleteTarget.fullName}.`);
        setDeleteTarget(null);
      },
    });
  }

  return (
    <section className="alimentacion-stack" aria-labelledby="alimentacion-title">
      <h1 className="visually-hidden" id="alimentacion-title">
        Registro de alimentación
      </h1>

      <AlimentacionToolbar
        deliveryMonth={deliveryMonth}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        search={search}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        exportButton={
          <div className="module-report-actions">
            <button
              className="alimentacion-bulk-import-action"
              type="button"
              aria-label="Importar formatos masivos"
              data-tooltip="Importar formatos masivos"
              disabled={!canImportRecords}
              onClick={() => setBulkImportOpen(true)}
            >
              <Files aria-hidden="true" />
              <span className="visually-hidden">Importar formatos masivos</span>
            </button>
            <ReportExportButton
              className="alimentacion-zip-action"
              period={reportPeriod}
              tenantId={reportTenantId}
              type="FORMATOS_ENTREGA_ALIMENTACION"
            />
            <ReportHistoryButton
              period={reportPeriod}
              tenantId={reportTenantId}
              type="FORMATOS_ENTREGA_ALIMENTACION"
            />
          </div>
        }
        onMonthChange={setDeliveryMonth}
        onSearchChange={setSearch}
        onTenantChange={setSelectedTenantId}
      />

      {registrosQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAlimentacionApiError(registrosQuery.error)}
        </p>
      ) : null}

      {exportError !== null ? (
        <p className="form-error" role="alert">
          {exportError}
        </p>
      ) : null}

      {importError !== null && importDialog === null ? (
        <p className="form-error" role="alert">
          {importError}
        </p>
      ) : null}

      <input
        ref={importFileInputRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,application/pdf"
        tabIndex={-1}
        onChange={handleImportFileChange}
      />

      <AlimentacionTable
        canManageAlimentacion={canManageRecords}
        downloadingImportedVersionId={downloadingImportedVersionId}
        exportingAdultoMayorId={exportingAdultoMayorId}
        importingAdultoMayorId={
          importMutation.isPending ? (importDialog?.adultoMayorId ?? null) : null
        }
        isLoading={registrosQuery.isLoading}
        records={registrosQuery.data?.registros ?? []}
        showTenantColumn={showTenantFilter}
        onExportFormato={handleExportFormato}
        onDelete={handleRequestDelete}
        onImportFormato={handleRequestImport}
        onDownloadImportedFormato={(params) => void handleDownloadImportedFormato(params)}
        onOpenImportedFormatoHistory={openImportedFormatoHistory}
        onOpenEdit={(recordId) => navigate(buildAlimentacionEditPath(recordId))}
      />

      {canManageRecords ? (
        <button
          className="alimentacion-floating-action"
          type="button"
          aria-label="Agregar registro de alimentación"
          data-tooltip="Agregar registro de alimentación"
          onClick={() => navigate(REGISTRO_ALIMENTACION_NEW_PATH)}
        >
          <Plus aria-hidden="true" />
        </button>
      ) : null}

      {bulkImportOpen ? (
        <AlimentacionBulkImportDialog
          deliveryMonth={effectiveDeliveryMonth ?? getCurrentMonthInputValue()}
          selectedTenantId={selectedTenantId}
          showTenantSelection={showTenantFilter}
          tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
          onClose={() => setBulkImportOpen(false)}
          onCompleted={() => {
            setBulkImportOpen(false);
            void registrosQuery.refetch();
          }}
        />
      ) : null}

      {importDialog !== null ? (
        <AlimentacionImportedPdfDialog
          deliveryMonth={importDialog.deliveryMonth}
          errorMessage={
            importMutation.isError
              ? (resolveAlimentacionApiError(importMutation.error) ??
                "No fue posible importar el PDF.")
              : null
          }
          file={importDialog.file}
          fullName={importDialog.fullName}
          hasExistingVersion={importDialog.hasImportedFormato}
          isPending={importMutation.isPending}
          onClose={closeImportDialog}
          onConfirm={confirmImport}
        />
      ) : null}

      {historyTarget !== null ? (
        <AlimentacionImportedPdfVersionsDialog
          downloadingVersionId={downloadingImportedVersionId}
          errorMessage={
            importedVersionsQuery.isError
              ? (resolveAlimentacionApiError(importedVersionsQuery.error) ??
                "No fue posible cargar las versiones importadas.")
              : null
          }
          fullName={historyTarget.fullName}
          isLoading={importedVersionsQuery.isLoading}
          versions={importedVersionsQuery.data?.versions ?? []}
          onClose={() => setHistoryTarget(null)}
          onDownload={handleHistoryDownload}
        />
      ) : null}

      {deleteTarget !== null ? (
        <AlimentacionDeleteDialog
          errorMessage={
            deleteMutation.isError
              ? (resolveAlimentacionApiError(deleteMutation.error) ??
                "No fue posible eliminar el registro.")
              : null
          }
          isPending={deleteMutation.isPending}
          record={deleteTarget}
          onClose={closeDeleteDialog}
          onConfirm={confirmDelete}
        />
      ) : null}
    </section>
  );
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
