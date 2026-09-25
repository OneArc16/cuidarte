import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, FileSpreadsheet, FileX2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { downloadBlob } from "@/features/adultos-mayores/lib/download-file";
import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { resolveAdultosMayoresApiError } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
import {
  useAdultoMayorImportQuery,
  useConfirmAdultoMayorImportMutation,
  useValidateAdultoMayorImportMutation,
} from "../model/adultos-mayores-import-queries";
import { useAdultoMayorTenantOptionsQuery } from "../model/adultos-mayores-queries";
import { canImportAdultosMayores } from "../lib/adultos-mayores-permissions";
import { AdultosMayoresImportConfirmation } from "../components/adultos-mayores-import-confirmation";
import { AdultosMayoresImportIssuesTable as IssuesTable } from "../components/adultos-mayores-import-issues-table";
import { AdultosMayoresImportSummary as Summary } from "../components/adultos-mayores-import-summary";
import { AdultosMayoresImportTarget as Target } from "../components/adultos-mayores-import-target";
import { AdultosMayoresImportUpload as UploadZone } from "../components/adultos-mayores-import-upload";
import {
  downloadAdultoMayorImportErrors,
  downloadAdultoMayorImportTemplate,
} from "../api/adultos-mayores-import-api";

type AdultosMayoresImportPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function AdultosMayoresImportPage({ navigate, user }: AdultosMayoresImportPageProps) {
  const shouldLoadTenantOptions = user.role === "super_admin" || user.role === "admin";
  const tenantOptionsQuery = useAdultoMayorTenantOptionsQuery(shouldLoadTenantOptions);
  const validateMutation = useValidateAdultoMayorImportMutation();
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState(user.tenantId ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const importQuery = useAdultoMayorImportQuery(activeImportId, activeImportId !== null);
  const activeDetail = importQuery.data ?? validateMutation.data ?? null;
  const confirmMutation = useConfirmAdultoMayorImportMutation(activeImportId);
  const tenantOptions = tenantOptionsQuery.data?.tenants ?? [];
  const canSelectTenant = user.role === "super_admin";
  const canImport = canImportAdultosMayores(user);

  useEffect(() => {
    if (user.role === "super_admin") {
      return;
    }

    if (user.tenantId === null) {
      setLocalError("Tu usuario no tiene un centro asociado.");
    }
  }, [user.role, user.tenantId]);

  useEffect(() => {
    setSelectedFile(null);
    setActiveImportId(null);
    validateMutation.reset();
    confirmMutation.reset();
    setLocalError(null);
  }, [selectedTenantId]);

  useEffect(() => {
    if (validateMutation.isError) {
      setLocalError(resolveAdultosMayoresApiError(validateMutation.error));
    }
  }, [validateMutation.error, validateMutation.isError]);

  useEffect(() => {
    if (confirmMutation.isError) {
      setLocalError(resolveAdultosMayoresApiError(confirmMutation.error));
    }
  }, [confirmMutation.error, confirmMutation.isError]);

  async function handleDownloadTemplate() {
    try {
      const blob = await downloadAdultoMayorImportTemplate();
      downloadBlob(blob, "plantilla-importacion-adultos-mayores-v2.xlsx");
    } catch (error: unknown) {
      setLocalError(resolveAdultosMayoresApiError(error));
    }
  }

  async function handleDownloadErrors(importId: string) {
    try {
      const blob = await downloadAdultoMayorImportErrors(importId);
      downloadBlob(blob, `errores-importacion-adultos-mayores-${importId}.xlsx`);
    } catch (error: unknown) {
      setLocalError(resolveAdultosMayoresApiError(error));
    }
  }

  function handleValidate() {
    if (!canImport) {
      return;
    }

    if (selectedFile === null) {
      setLocalError("Selecciona un archivo .xlsx antes de validar.");
      return;
    }

    const tenantId = canSelectTenant ? selectedTenantId.trim() || null : null;

    if (canSelectTenant && tenantId === null) {
      setLocalError("Selecciona el centro donde se importaran los adultos mayores.");
      return;
    }

    confirmMutation.reset();
    setLocalError(null);

    validateMutation.mutate(
      { file: selectedFile, tenantId },
      {
        onSuccess: (detail) => {
          setActiveImportId(detail.importId);
          setLocalError(null);
          toast.success("Archivo validado.");
        },
      },
    );
  }

  function handleConfirm() {
    confirmMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Importacion confirmada.");
      },
    });
  }

  function handleCancelConfirmation() {
    confirmMutation.reset();
    validateMutation.reset();
    setActiveImportId(null);
    setLocalError(null);
  }

  const isBusy = validateMutation.isPending || confirmMutation.isPending || importQuery.isLoading;
  const selectedTenantName = canSelectTenant
    ? (tenantOptions.find((tenant) => tenant.id === selectedTenantId)?.name ?? "")
    : (tenantOptions.find((tenant) => tenant.id === user.tenantId)?.name ?? "Centro asociado");

  return (
    <section className="import-page" aria-labelledby="adultos-import-title">
      <h1 className="visually-hidden" id="adultos-import-title">
        Importar adultos mayores
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="adultos-form-nav__context">Importar adultos mayores</span>
      </div>

      <section className="import-setup-grid" aria-label="Configuracion inicial de la importacion">
        <article className="import-step-card">
          <div className="import-step-card__header">
            <span className="import-step-card__index">1.</span>
            <div>
              <h2>Informacion y plantilla</h2>
            </div>
          </div>

          <div className="import-step-card__actions">
            <button className="outline-action" type="button" onClick={handleDownloadTemplate}>
              <FileSpreadsheet aria-hidden="true" />
              <span>Descargar plantilla</span>
            </button>
            {activeDetail?.issues.length ? (
              <button
                className="outline-action"
                type="button"
                onClick={() => handleDownloadErrors(activeDetail.importId)}
              >
                <FileX2 aria-hidden="true" />
                <span>Descargar errores</span>
              </button>
            ) : null}
          </div>
        </article>

        <article className="import-step-card">
          <div className="import-step-card__header">
            <span className="import-step-card__index">2.</span>
            <div>
              <h2>Configuracion y archivo</h2>
              <p>
                Selecciona el centro de destino, carga el Excel y valida el lote antes de confirmar.
              </p>
            </div>
          </div>

          {localError !== null ? (
            <p className="form-error" role="alert">
              {localError}
            </p>
          ) : null}

          <div className="import-step-card__body">
            <Target
              user={user}
              tenantOptions={tenantOptions}
              tenantId={selectedTenantId}
              disabled={!canImport || tenantOptionsQuery.isLoading}
              onTenantChange={(tenantId) => {
                setSelectedTenantId(tenantId);
              }}
            />

            <UploadZone
              file={selectedFile}
              disabled={!canImport || isBusy || (canSelectTenant && selectedTenantId.trim() === "")}
              onClearFile={() => setSelectedFile(null)}
              onSelectFile={(file) => {
                setSelectedFile(file);
                setLocalError(null);
                confirmMutation.reset();
              }}
            />
          </div>

          <div className="import-actions import-actions--compact">
            <button
              className="primary-action import-primary-action"
              type="button"
              disabled={
                !canImport ||
                isBusy ||
                selectedFile === null ||
                (canSelectTenant && selectedTenantId.trim() === "")
              }
              onClick={handleValidate}
            >
              {validateMutation.isPending ? "Validando..." : "Validar archivo"}
            </button>
          </div>
        </article>
      </section>

      {activeDetail !== null ? (
        <>
          <Summary detail={activeDetail} />
          <IssuesTable issues={activeDetail.issues} />
          <div className="import-confirmation__wrap">
            <AdultosMayoresImportConfirmation
              detail={activeDetail}
              isPending={confirmMutation.isPending}
              onConfirm={handleConfirm}
              onCancel={handleCancelConfirmation}
            />
          </div>
        </>
      ) : null}

      {validateMutation.isSuccess && activeDetail !== null ? (
        <p className="import-success" role="status">
          {activeDetail.status === "ready"
            ? "Validacion completada. Puedes confirmar el lote."
            : "Validacion completada con observaciones. Revisa el detalle."}
        </p>
      ) : null}

      {confirmMutation.isSuccess ? (
        <p className="import-success" role="status">
          La importacion se completo correctamente.
        </p>
      ) : null}

      <p className="import-context">
        Centro actual: <strong>{selectedTenantName}</strong>
      </p>
    </section>
  );
}
