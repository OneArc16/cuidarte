import {
  type AlimentacionBulkImportItem,
  type AlimentacionBulkImportMode,
  type AlimentacionBulkImportValidateResponse,
  type AlimentacionTenantOption,
} from "@cuidarte/contracts";
import { AlertTriangle, CheckCircle2, FileUp, Files, LoaderCircle, X } from "lucide-react";
import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";

import { resolveAlimentacionApiError } from "../lib/alimentacion-formatters";
import {
  useConfirmBulkAlimentacionFormatoEntregaMutation,
  useValidateBulkAlimentacionFormatoEntregaMutation,
} from "../model/alimentacion-queries";

type Props = {
  deliveryMonth: string;
  selectedTenantId: string;
  showTenantSelection: boolean;
  tenantOptions: AlimentacionTenantOption[];
  onClose: () => void;
  onCompleted: () => void;
};

type LocalFile = {
  id: string;
  file: File;
  error: string | null;
  documentNumber: string | null;
  month: string | null;
};

type BulkPreview = Omit<AlimentacionBulkImportValidateResponse, "batchId"> & {
  batchIds: string[];
  itemBatchIds: Record<string, string>;
};

type BulkDecisionItem = AlimentacionBulkImportItem & {
  decision: "import" | "skip";
};

const BULK_IMPORT_BLOCK_SIZE = 100;
const BULK_IMPORT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const BULK_IMPORT_MAX_BLOCK_BYTES = 100 * 1024 * 1024;
const BULK_FILENAME_PATTERN = /^([A-Za-z0-9._-]+?)[_-](\d{4})[_-](0[1-9]|1[0-2])\.pdf$/i;

export function AlimentacionBulkImportDialog({
  deliveryMonth,
  selectedTenantId,
  showTenantSelection,
  tenantOptions,
  onClose,
  onCompleted,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<AlimentacionBulkImportMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(deliveryMonth);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<BulkPreview | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "import" | "skip">>({});
  const [blockProgress, setBlockProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const validateMutation = useValidateBulkAlimentacionFormatoEntregaMutation();
  const confirmMutation = useConfirmBulkAlimentacionFormatoEntregaMutation();
  const isPending = validateMutation.isPending || confirmMutation.isPending;
  const tenantName = tenantOptions.find((tenant) => tenant.id === selectedTenantId)?.name;
  const hasTenant = !showTenantSelection || selectedTenantId !== "";
  const invalidFileCount = files.filter((entry) => entry.error !== null).length;
  const totalBytes = files.reduce((total, entry) => total + entry.file.size, 0);
  const selectedCount = useMemo(
    () => Object.values(decisions).filter((decision) => decision === "import").length,
    [decisions],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function changeMode(nextMode: AlimentacionBulkImportMode) {
    setMode(nextMode);
    setFiles((current) => validateLocalFiles(current, nextMode, selectedMonth));
    setPreview(null);
    validateMutation.reset();
    confirmMutation.reset();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function addFiles(selectedFiles: File[]) {
    if (selectedFiles.length === 0) return;
    const nextFiles = [
      ...files,
      ...selectedFiles.map((file) => ({
        id: createLocalFileId(file),
        file,
        error: null,
        documentNumber: null,
        month: null,
      })),
    ];
    setFiles(validateLocalFiles(nextFiles, mode, selectedMonth));
    setPreview(null);
    validateMutation.reset();
    confirmMutation.reset();
  }

  function removeFile(fileId: string) {
    setFiles((current) =>
      validateLocalFiles(
        current.filter((entry) => entry.id !== fileId),
        mode,
        selectedMonth,
      ),
    );
    setPreview(null);
  }

  function removeErrors() {
    setFiles((current) => current.filter((entry) => entry.error === null));
    setPreview(null);
  }

  function removeAll() {
    setFiles([]);
    setPreview(null);
    validateMutation.reset();
    confirmMutation.reset();
  }

  async function validateFiles() {
    if (files.length === 0 || invalidFileCount > 0 || !hasTenant) return;
    const blocks = chunkFiles(
      files.map((entry) => entry.file),
      BULK_IMPORT_BLOCK_SIZE,
      BULK_IMPORT_MAX_BLOCK_BYTES,
    );
    const results: AlimentacionBulkImportValidateResponse[] = [];
    validateMutation.reset();
    setBlockProgress({ current: 0, total: blocks.length });

    try {
      for (const [index, block] of blocks.entries()) {
        setBlockProgress({ current: index + 1, total: blocks.length });
        results.push(
          await validateMutation.mutateAsync({
            query: {
              mode,
              deliveryMonth: mode === "month" ? selectedMonth : null,
              tenantId: showTenantSelection ? selectedTenantId : null,
            },
            files: block,
          }),
        );
      }

      const items = markCrossBlockDuplicates(results.flatMap((result) => result.items));
      const itemBatchIds = Object.fromEntries(
        results.flatMap((result) => result.items.map((item) => [item.itemId, result.batchId])),
      );
      setPreview({
        batchIds: results.map((result) => result.batchId),
        itemBatchIds,
        expiresAt: results[0]?.expiresAt ?? new Date().toISOString(),
        summary: summarizeBulkItems(items),
        items,
      });
      setDecisions(
        Object.fromEntries(
          items.map((item) => [
            item.itemId,
            item.status === "ready" || item.status === "warning" ? "import" : "skip",
          ]),
        ),
      );
    } finally {
      setBlockProgress(null);
    }
  }

  async function confirmImport() {
    if (preview === null) return;
    const itemsByBatch = new Map<string, BulkDecisionItem[]>();
    for (const item of preview.items) {
      const batchId = preview.itemBatchIds[item.itemId];
      if (batchId === undefined) continue;
      const current = itemsByBatch.get(batchId) ?? [];
      current.push({ ...item, decision: decisions[item.itemId] ?? "skip" });
      itemsByBatch.set(batchId, current);
    }

    try {
      const results = [];
      for (const [batchId, items] of itemsByBatch) {
        results.push(
          await confirmMutation.mutateAsync({
            batchId,
            items: items.map((item) => ({ itemId: item.itemId, decision: item.decision })),
          }),
        );
      }
      const resultByItemId = new Map(
        results.flatMap((result) => result.items.map((item) => [item.itemId, item])),
      );
      const updatedItems = preview.items.map((item) => resultByItemId.get(item.itemId) ?? item);
      const summary = summarizeBulkItems(updatedItems);
      setPreview((current) =>
        current === null ? current : { ...current, items: updatedItems, summary },
      );
      if (summary.imported > 0 || summary.skipped > 0) onCompleted();
    } catch {
      // React Query exposes the API error in confirmMutation for the dialog.
    }
  }

  const footerStatus =
    files.length === 0
      ? ""
      : invalidFileCount > 0
        ? invalidFileCount +
          (invalidFileCount === 1 ? " archivo tiene error" : " archivos tienen error")
        : files.length + " archivos listos";

  return (
    <div className="alimentacion-bulk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="alimentacion-bulk-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alimentacion-bulk-dialog-title"
        aria-describedby="alimentacion-bulk-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="alimentacion-bulk-dialog__header">
          <div>
            <p className="alimentacion-bulk-dialog__eyebrow">Formatos diligenciados</p>
            <h2 id="alimentacion-bulk-dialog-title">Importación masiva</h2>
            <p id="alimentacion-bulk-dialog-description">
              Sube varios PDF; se asignan a cada persona por documento y mes.
            </p>
          </div>
          <button
            className="alimentacion-bulk-dialog__close"
            type="button"
            aria-label="Cerrar modal"
            onClick={onClose}
            disabled={isPending}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="alimentacion-bulk-dialog__body">
          {preview === null ? (
            <>
              <div
                className="alimentacion-bulk-dialog__mode-grid"
                role="radiogroup"
                aria-label="Modo de importación"
              >
                <label className={mode === "month" ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="bulk-import-mode"
                    checked={mode === "month"}
                    onChange={() => changeMode("month")}
                  />
                  <span>Un mes</span>
                </label>
                <label className={mode === "all" ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="bulk-import-mode"
                    checked={mode === "all"}
                    onChange={() => changeMode("all")}
                  />
                  <span>Todos los meses</span>
                </label>
              </div>
              {mode === "month" ? (
                <label className="alimentacion-bulk-dialog__month-field">
                  <span>Mes de importación</span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => {
                      const nextMonth = event.target.value;
                      setSelectedMonth(nextMonth);
                      setFiles((current) => validateLocalFiles(current, mode, nextMonth));
                      setPreview(null);
                    }}
                  />
                </label>
              ) : null}
              <div className="alimentacion-bulk-dialog__rule">
                {mode === "month" ? (
                  <>
                    Todos deben ser de{" "}
                    <strong>
                      {selectedMonth === ""
                        ? "el mes seleccionado"
                        : formatMonthLong(selectedMonth)}
                    </strong>{" "}
                    y usar guiones o guiones bajos entre cédula, año y mes.
                  </>
                ) : (
                  <>
                    Cada archivo indica su mes al final, usando guiones o guiones bajos.
                  </>
                )}
                <small>
                  Ejemplo:{" "}
                  <code>
                    {mode === "month"
                      ? "1004462425_" + (selectedMonth || "AAAA-MM").replace("-", "_")
                      : "1004462425_2026_08"}
                    .pdf
                  </code>
                </small>
              </div>
              {showTenantSelection ? (
                <p className="alimentacion-bulk-dialog__tenant">
                  <strong>Sede:</strong> {tenantName ?? "Selecciona una sede en el filtro superior"}
                </p>
              ) : null}
              <label
                className={
                  isDragging
                    ? "alimentacion-bulk-dialog__dropzone is-dragging"
                    : "alimentacion-bulk-dialog__dropzone"
                }
                onDragEnter={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragOver={(event) => event.preventDefault()}
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setIsDragging(false);
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  className="visually-hidden"
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  onChange={handleFileChange}
                />
                <span className="alimentacion-bulk-dialog__dropzone-icon">
                  <FileUp aria-hidden="true" />
                </span>
                <span className="alimentacion-bulk-dialog__dropzone-copy">
                  <strong>
                    Arrastra los PDF aquí o <em>selecciónalos</em>
                  </strong>
                  <small>Se procesan automáticamente en bloques de 100.</small>
                </span>
              </label>
              {files.length > 0 ? (
                <div className="alimentacion-bulk-dialog__files-section">
                  <div className="alimentacion-bulk-dialog__files-heading">
                    <strong>
                      Archivos <span>· {files.length}</span>
                    </strong>
                    <div>
                      {invalidFileCount > 0 ? (
                        <button type="button" onClick={removeErrors}>
                          Quitar los que tienen error
                        </button>
                      ) : null}
                      <button type="button" onClick={removeAll}>
                        Quitar todos
                      </button>
                    </div>
                  </div>
                  <ul className="alimentacion-bulk-dialog__file-list">
                    {[...files]
                      .sort(
                        (left, right) => Number(right.error !== null) - Number(left.error !== null),
                      )
                      .map((entry) => (
                        <li className={entry.error !== null ? "has-error" : ""} key={entry.id}>
                          <span className="alimentacion-bulk-dialog__pdf-badge">PDF</span>
                          <span className="alimentacion-bulk-dialog__file-copy">
                            <strong title={entry.file.name}>{entry.file.name}</strong>
                            <small>
                              {formatFileSize(entry.file.size)} ·{" "}
                              {entry.error ?? formatLocalFileStatus(entry)}
                            </small>
                          </span>
                          <button
                            type="button"
                            aria-label={"Quitar " + entry.file.name}
                            onClick={() => removeFile(entry.id)}
                          >
                            <X aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                  </ul>
                  <div className="alimentacion-bulk-dialog__usage">
                    <div>
                      <span>{formatFileUsage(files.length)}</span>
                      <span>{formatFileSize(totalBytes)} de 100 MB</span>
                    </div>
                    <div className="alimentacion-bulk-dialog__usage-track">
                      <span
                        style={{
                          width:
                            Math.min(100, (totalBytes / BULK_IMPORT_MAX_BLOCK_BYTES) * 100) + "%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {blockProgress !== null ? (
                <p className="alimentacion-bulk-dialog__progress" role="status">
                  Validando bloque {blockProgress.current} de {blockProgress.total}…
                </p>
              ) : null}
              {validateMutation.isError ? (
                <p className="form-error" role="alert">
                  {resolveAlimentacionApiError(validateMutation.error) ??
                    "No fue posible validar los archivos."}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <div className="alimentacion-bulk-dialog__summary">
                <strong>
                  {preview.summary.ready + preview.summary.warnings} listos para importar
                </strong>
                <span>
                  {preview.summary.errors} con error · {preview.summary.warnings} advertencias
                </span>
              </div>
              <div className="alimentacion-bulk-dialog__table-wrap">
                <table className="alimentacion-bulk-dialog__table">
                  <thead>
                    <tr>
                      <th>Archivo</th>
                      <th>Adulto mayor</th>
                      <th>Mes</th>
                      <th>Estado</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.items.map((item) => (
                      <BulkImportRow
                        key={item.itemId}
                        item={item}
                        decision={decisions[item.itemId] ?? "skip"}
                        onDecision={(decision) =>
                          setDecisions((current) => ({ ...current, [item.itemId]: decision }))
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {confirmMutation.isError ? (
                <p className="form-error" role="alert">
                  {resolveAlimentacionApiError(confirmMutation.error) ??
                    "No fue posible confirmar la importación."}
                </p>
              ) : null}
            </>
          )}
        </div>

        <footer className="alimentacion-bulk-dialog__actions">
          <p aria-live="polite" className={invalidFileCount > 0 ? "has-error" : ""}>
            {preview === null
              ? footerStatus
              : preview.summary.imported + " importados · " + preview.summary.errors + " con error"}
          </p>
          <div>
            <button
              className="secondary-action"
              type="button"
              onClick={preview === null ? onClose : () => setPreview(null)}
              disabled={isPending}
            >
              {preview === null ? "Cancelar" : "Volver"}
            </button>
            {preview === null ? (
              <button
                className="primary-action"
                type="button"
                onClick={validateFiles}
                disabled={
                  isPending ||
                  files.length === 0 ||
                  invalidFileCount > 0 ||
                  !hasTenant ||
                  (mode === "month" && selectedMonth === "")
                }
              >
                {validateMutation.isPending ? (
                  <>
                    <LoaderCircle
                      className="alimentacion-bulk-dialog__spinner"
                      aria-hidden="true"
                    />{" "}
                    Validando…
                  </>
                ) : (
                  "Validar " + files.length + " archivos"
                )}
              </button>
            ) : (
              <button
                className="primary-action"
                type="button"
                onClick={confirmImport}
                disabled={isPending || selectedCount === 0}
              >
                {confirmMutation.isPending ? (
                  <LoaderCircle className="alimentacion-bulk-dialog__spinner" aria-hidden="true" />
                ) : (
                  "Importar " + selectedCount
                )}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function BulkImportRow({
  item,
  decision,
  onDecision,
}: {
  item: AlimentacionBulkImportItem;
  decision: "import" | "skip";
  onDecision: (decision: "import" | "skip") => void;
}) {
  const isError = item.status === "error";
  return (
    <tr>
      <td title={item.originalName}>{item.originalName}</td>
      <td>{item.adultoMayorFullName ?? item.documentNumber ?? "—"}</td>
      <td>{item.deliveryMonth ?? "—"}</td>
      <td>
        <span className={"alimentacion-bulk-status alimentacion-bulk-status--" + item.status}>
          {isError ? (
            <AlertTriangle aria-hidden="true" />
          ) : item.status === "imported" ? (
            <CheckCircle2 aria-hidden="true" />
          ) : null}
          {item.reasonMessage ?? labelForStatus(item.status)}
        </span>
      </td>
      <td>
        <select
          aria-label={"Acción para " + item.originalName}
          value={isError || item.status === "imported" ? "skip" : decision}
          onChange={(event) => onDecision(event.target.value as "import" | "skip")}
          disabled={isError || item.status === "imported"}
        >
          <option value="import">Importar</option>
          <option value="skip">Omitir</option>
        </select>
      </td>
    </tr>
  );
}

function validateLocalFiles(
  entries: LocalFile[],
  mode: AlimentacionBulkImportMode,
  deliveryMonth: string,
): LocalFile[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const name = entry.file.name.trim().toLowerCase();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return entries.map((entry) => {
    const parsed = parseLocalFilename(entry.file.name);
    let error: string | null = null;
    if (!isPdfFile(entry.file)) error = "No es un PDF";
    else if (entry.file.size === 0 || entry.file.size > BULK_IMPORT_MAX_FILE_SIZE)
      error = "Supera 10 MB";
    else if ((counts.get(entry.file.name.trim().toLowerCase()) ?? 0) > 1)
      error = "Archivo repetido";
    else if (parsed === null)
      error =
        mode === "month"
          ? "Falta el mes al final: -AAAA-MM.pdf o _AAAA_MM.pdf"
          : "Falta el mes al final: -AAAA-MM.pdf o _AAAA_MM.pdf";
    else if (mode === "month" && parsed.month !== deliveryMonth)
      error = "Debe indicar el mes " + deliveryMonth + " al final del nombre.";
    return {
      ...entry,
      error,
      documentNumber: parsed?.documentNumber ?? null,
      month: parsed?.month ?? null,
    };
  });
}

function parseLocalFilename(filename: string): { documentNumber: string; month: string } | null {
  const match = BULK_FILENAME_PATTERN.exec(filename.split(/[\/]/).pop()?.trim() ?? "");
  if (match === null) return null;
  return { documentNumber: match[1]!, month: `${match[2]}-${match[3]}` };
}

function formatLocalFileStatus(entry: LocalFile): string {
  if (entry.month === null) return "";
  return "✓ Doc. " + (entry.documentNumber ?? "") + " · " + formatMonthShort(entry.month);
}

function formatMonthLong(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;
  return new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .replace(" de ", " ");
}

function formatMonthShort(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) return monthValue;
  return new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1).replace(".0", "") + " MB";
}

function formatFileUsage(fileCount: number): string {
  if (fileCount <= BULK_IMPORT_BLOCK_SIZE) {
    return fileCount + " de " + BULK_IMPORT_BLOCK_SIZE + " archivos";
  }
  return fileCount + " archivos · " + Math.ceil(fileCount / BULK_IMPORT_BLOCK_SIZE) + " bloques";
}

function createLocalFileId(file: File): string {
  return file.name + "|" + file.size + "|" + file.lastModified + "|" + Math.random();
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function chunkFiles(files: File[], maxFiles: number, maxBytes: number): File[][] {
  const chunks: File[][] = [];
  let current: File[] = [];
  let currentBytes = 0;
  for (const file of files) {
    if (current.length > 0 && (current.length >= maxFiles || currentBytes + file.size > maxBytes)) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(file);
    currentBytes += file.size;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

function markCrossBlockDuplicates(
  items: AlimentacionBulkImportItem[],
): AlimentacionBulkImportItem[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (item.adultoMayorId === null || item.deliveryMonth === null || item.status === "error")
      return item;
    const documentNumber = item.documentNumber?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (documentNumber === undefined) return item;
    const key = documentNumber + ":" + item.deliveryMonth;
    if (!seen.has(key)) {
      seen.add(key);
      return item;
    }
    return {
      ...item,
      status: "error",
      reasonCode: "DUPLICATE_IN_BATCH",
      reasonMessage: "Este adulto y mes ya aparecen en otro bloque del mismo lote.",
    };
  });
}

function summarizeBulkItems(items: AlimentacionBulkImportItem[]) {
  return {
    total: items.length,
    ready: items.filter((item) => item.status === "ready").length,
    warnings: items.filter((item) => item.status === "warning").length,
    errors: items.filter((item) => item.status === "error").length,
    imported: items.filter((item) => item.status === "imported").length,
    skipped: items.filter((item) => item.status === "skipped").length,
  };
}

function labelForStatus(status: AlimentacionBulkImportItem["status"]): string {
  if (status === "ready") return "Listo";
  if (status === "warning") return "Advertencia";
  if (status === "imported") return "Importado";
  if (status === "skipped") return "Omitido";
  return "Error";
}
