import { type AlimentacionImportedFormatoVersion, type AuthUser } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  downloadAlimentacionImportedFormatoVersion,
  exportAlimentacionFormatoEntregaPdf,
} from "../api/alimentacion-api";
import { AlimentacionImportedPdfDialog } from "../components/alimentacion-imported-pdf-dialog";
import { AlimentacionImportedPdfVersionsDialog } from "../components/alimentacion-imported-pdf-versions-dialog";
import { AlimentacionTable } from "../components/alimentacion-table";
import { AlimentacionToolbar } from "../components/alimentacion-toolbar";
import {
  REGISTRO_ALIMENTACION_NEW_PATH,
  buildAlimentacionEditPath,
} from "../lib/alimentacion-paths";
import { downloadBlob } from "../lib/download-file";
import { canManageAlimentacion } from "../lib/alimentacion-permissions";
import {
  getCurrentMonthInputValue,
  resolveAlimentacionApiError,
} from "../lib/alimentacion-formatters";
import {
  useAlimentacionListQuery,
  useAlimentacionImportedFormatoVersionsQuery,
  useAlimentacionTenantOptionsQuery,
  useImportAlimentacionFormatoEntregaMutation,
} from "../model/alimentacion-queries";

type AlimentacionIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

type ImportTarget = {
  adultoMayorId: string;
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
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const [importDialog, setImportDialog] = useState<ImportDialogState | null>(null);
  const [historyTarget, setHistoryTarget] = useState<ImportedFormatoHistoryTarget | null>(null);
  const [downloadingImportedVersionId, setDownloadingImportedVersionId] = useState<string | null>(
    null,
  );
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const showTenantFilter = user.role === "super_admin";
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(showTenantFilter);
  const canManageRecords = canManageAlimentacion(user);
  const effectiveDeliveryMonth = deliveryMonth.trim() === "" ? null : deliveryMonth;
  const registrosQuery = useAlimentacionListQuery({
    search,
    deliveryMonth: effectiveDeliveryMonth,
    tenantId: showTenantFilter
      ? selectedTenantId === ""
        ? null
        : selectedTenantId
      : user.tenantId,
  });
  const importMutation = useImportAlimentacionFormatoEntregaMutation();
  const importedVersionsQuery = useAlimentacionImportedFormatoVersionsQuery(
    historyTarget?.adultoMayorId ?? null,
    historyTarget?.deliveryMonth ?? null,
    historyTarget !== null,
  );

  async function handleExportFormato(params: {
    adultoMayorId: string;
    documentNumber: string;
    fullName: string;
  }) {
    if (effectiveDeliveryMonth === null) {
      setExportError("Selecciona un mes para exportar el formato de alimentación.");
      return;
    }

    setExportingAdultoMayorId(params.adultoMayorId);
    setExportError(null);

    try {
      const blob = await exportAlimentacionFormatoEntregaPdf({
        adultoMayorId: params.adultoMayorId,
        deliveryMonth: effectiveDeliveryMonth,
      });

      downloadBlob(
        blob,
        buildFormatoEntregaFilename(params.documentNumber, effectiveDeliveryMonth),
      );
    } catch (error: unknown) {
      setExportError(resolveAlimentacionApiError(error) ?? "No fue posible completar la descarga.");
    } finally {
      setExportingAdultoMayorId(null);
    }
  }

  function handleRequestImport(params: ImportTarget) {
    if (effectiveDeliveryMonth === null) {
      setImportError("Selecciona un mes para importar el formato de alimentación.");
      return;
    }

    importMutation.reset();
    setImportError(null);
    setImportSuccess(null);
    setImportTarget(params);
    importFileInputRef.current?.click();
  }

  function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    event.target.value = "";

    if (file === null || importTarget === null || effectiveDeliveryMonth === null) {
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
      deliveryMonth: effectiveDeliveryMonth,
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
          setImportSuccess(
            `PDF importado correctamente como versión ${version.version} para ${importDialog.fullName}.`,
          );
          setImportDialog(null);
          setImportTarget(null);
        },
      },
    );
  }

  function openImportedFormatoHistory(params: { adultoMayorId: string; fullName: string }) {
    if (effectiveDeliveryMonth === null) {
      setImportError("Selecciona un mes para consultar las versiones importadas.");
      return;
    }

    setHistoryTarget({ ...params, deliveryMonth: effectiveDeliveryMonth });
  }

  async function handleDownloadImportedFormato(params: {
    adultoMayorId: string;
    versionId: string;
    originalName: string;
  }) {
    setDownloadingImportedVersionId(params.versionId);
    setImportError(null);

    try {
      const blob = await downloadAlimentacionImportedFormatoVersion({
        adultoMayorId: params.adultoMayorId,
        versionId: params.versionId,
      });

      downloadBlob(blob, params.originalName);
    } catch (error: unknown) {
      setImportError(
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

      {importSuccess !== null ? (
        <p className="success-banner" role="status">
          {importSuccess}
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
          title="Agregar registro de alimentación"
          onClick={() => navigate(REGISTRO_ALIMENTACION_NEW_PATH)}
        >
          <Plus aria-hidden="true" />
        </button>
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
    </section>
  );
}

function buildFormatoEntregaFilename(documentNumber: string, deliveryMonth: string): string {
  const sanitizedDocument = documentNumber.replace(/[^a-zA-Z0-9._-]/g, "-");

  return `formato-entrega-${sanitizedDocument}-${deliveryMonth}.pdf`;
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
