import { type AlimentacionListItem } from "@cuidarte/contracts";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  Download,
  FileDown,
  History,
  LoaderCircle,
  Pencil,
  Upload,
} from "lucide-react";
import { Fragment, useCallback, useMemo, useState } from "react";

import {
  formatAlimentacionOrganizer,
  formatAlimentacionStatus,
} from "../lib/alimentacion-formatters";

type AlimentacionTableProps = {
  canManageAlimentacion: boolean;
  isLoading: boolean;
  records: AlimentacionListItem[];
  showTenantColumn: boolean;
  onOpenEdit: (recordId: string) => void;
  onExportFormato: (params: {
    adultoMayorId: string;
    documentNumber: string;
    fullName: string;
  }) => void;
  onImportFormato: (params: {
    adultoMayorId: string;
    documentNumber: string;
    fullName: string;
    hasImportedFormato: boolean;
  }) => void;
  onDownloadImportedFormato: (params: {
    adultoMayorId: string;
    versionId: string;
    originalName: string;
  }) => void;
  onOpenImportedFormatoHistory: (params: { adultoMayorId: string; fullName: string }) => void;
  exportingAdultoMayorId: string | null;
  importingAdultoMayorId: string | null;
  downloadingImportedVersionId: string | null;
};

type AlimentacionGroupedRecord = {
  adultoMayorId: string;
  documentNumber: string;
  fullName: string;
  tenantName: string;
  records: AlimentacionListItem[];
};

export function AlimentacionTable({
  canManageAlimentacion,
  isLoading,
  onOpenEdit,
  onExportFormato,
  onImportFormato,
  onDownloadImportedFormato,
  onOpenImportedFormatoHistory,
  exportingAdultoMayorId,
  importingAdultoMayorId,
  downloadingImportedVersionId,
  records,
  showTenantColumn,
}: AlimentacionTableProps) {
  const [expandedAdultoIds, setExpandedAdultoIds] = useState<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const toggleAdultoRows = useCallback((adultoMayorId: string) => {
    setExpandedAdultoIds((current) => {
      const next = new Set(current);

      if (next.has(adultoMayorId)) {
        next.delete(adultoMayorId);
      } else {
        next.add(adultoMayorId);
      }

      return next;
    });
  }, []);

  const groupedRecords = useMemo(() => {
    const groupsByAdultoId = new Map<string, AlimentacionGroupedRecord>();

    for (const record of records) {
      const existingGroup = groupsByAdultoId.get(record.adultoMayorId);

      if (existingGroup !== undefined) {
        existingGroup.records.push(record);
        continue;
      }

      groupsByAdultoId.set(record.adultoMayorId, {
        adultoMayorId: record.adultoMayorId,
        documentNumber: record.documentNumber,
        fullName: record.fullName,
        tenantName: record.tenantName,
        records: [record],
      });
    }

    return Array.from(groupsByAdultoId.values())
      .map((group) => ({
        ...group,
        records: [...group.records].sort((leftRecord, rightRecord) =>
          rightRecord.deliveryDate.localeCompare(leftRecord.deliveryDate),
        ),
      }))
      .sort((left, right) =>
        left.fullName.localeCompare(right.fullName, "es", { sensitivity: "base" }),
      );
  }, [records]);

  if (isLoading) {
    return (
      <div className="alimentacion-table-wrap" role="status">
        <table className="alimentacion-table">
          <tbody>
            <tr>
              <td>Cargando registros...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const columnCount = showTenantColumn ? 10 : 9;

  return (
    <div className="alimentacion-table-wrap">
      <table
        className={`alimentacion-table ${showTenantColumn ? "alimentacion-table--with-tenant" : "alimentacion-table--without-tenant"}`}
      >
        <colgroup>
          <col className="alimentacion-col-documento" />
          <col className="alimentacion-col-nombre" />
          <col className="alimentacion-col-fecha" />
          <col className="alimentacion-col-organizador" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          {showTenantColumn ? <col className="alimentacion-col-centro" /> : null}
          <col className="alimentacion-col-acciones" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Cédula</th>
            <th scope="col">Nombre</th>
            <th scope="col">Fecha</th>
            <th scope="col">Organizador</th>
            <th scope="col">Refrigerio 1</th>
            <th scope="col">Almuerzo</th>
            <th scope="col">Refrigerio 2</th>
            <th scope="col">Auxilio Transporte</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>
                No hay registros de alimentación para los filtros actuales.
              </td>
            </tr>
          ) : (
            groupedRecords.map((group) => {
              const isExpanded = expandedAdultoIds.has(group.adultoMayorId);
              const isExporting = exportingAdultoMayorId === group.adultoMayorId;
              const isImporting = importingAdultoMayorId === group.adultoMayorId;
              const latestRecord = group.records[0];
              const detailRowsRegionId = `alimentacion-registros-${group.adultoMayorId}`;

              if (latestRecord === undefined) {
                return null;
              }

              const importedFormato = latestRecord.importedFormato;

              return (
                <Fragment key={group.adultoMayorId}>
                  <tr className={`alimentacion-group-row ${isExpanded ? "is-expanded" : ""}`}>
                    <td>{group.documentNumber}</td>
                    <td className="alimentacion-cell-name">
                      {canManageAlimentacion ? (
                        <>
                          <button
                            className="alimentacion-record-trigger"
                            type="button"
                            aria-controls={detailRowsRegionId}
                            aria-expanded={isExpanded}
                            title="Mostrar registros del adulto mayor en el mes"
                            onClick={() => toggleAdultoRows(group.adultoMayorId)}
                          >
                            <strong>{group.fullName}</strong>
                          </button>
                          {importedFormato !== null ? (
                            <span className="alimentacion-imported-badge">
                              PDF importado v{importedFormato.version}
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <strong>{group.fullName}</strong>
                          {importedFormato !== null ? (
                            <span className="alimentacion-imported-badge">
                              PDF importado v{importedFormato.version}
                            </span>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td>{latestRecord.deliveryDate.slice(0, 7)}</td>
                    <td>{formatAlimentacionOrganizer(latestRecord.organizer)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.refrigerio1)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.almuerzo)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.refrigerio2)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.auxilioTransporte)}</td>
                    {showTenantColumn ? <td>{group.tenantName}</td> : null}
                    <td>
                      <div className="alimentacion-table-row-actions">
                        {canManageAlimentacion ? (
                          <>
                            <button
                              className="alimentacion-row-action"
                              type="button"
                              aria-label={
                                isExporting
                                  ? `Exportando formato de ${group.fullName}`
                                  : `Exportar formato de ${group.fullName}`
                              }
                              title={isExporting ? "Exportando formato..." : "Exportar formato"}
                              disabled={isExporting}
                              onClick={() =>
                                onExportFormato({
                                  adultoMayorId: group.adultoMayorId,
                                  documentNumber: group.documentNumber,
                                  fullName: group.fullName,
                                })
                              }
                            >
                              {isExporting ? (
                                <LoaderCircle aria-hidden="true" className="alimentacion-spin" />
                              ) : (
                                <Download aria-hidden="true" />
                              )}
                            </button>
                            <button
                              className="alimentacion-row-action"
                              type="button"
                              aria-label={
                                isImporting
                                  ? `Importando formato diligenciado de ${group.fullName}`
                                  : `Importar formato diligenciado de ${group.fullName}`
                              }
                              title={
                                isImporting
                                  ? "Importando formato..."
                                  : "Importar formato diligenciado"
                              }
                              disabled={isImporting}
                              onClick={() =>
                                onImportFormato({
                                  adultoMayorId: group.adultoMayorId,
                                  documentNumber: group.documentNumber,
                                  fullName: group.fullName,
                                  hasImportedFormato: importedFormato !== null,
                                })
                              }
                            >
                              {isImporting ? (
                                <LoaderCircle aria-hidden="true" className="alimentacion-spin" />
                              ) : (
                                <Upload aria-hidden="true" />
                              )}
                            </button>
                            {importedFormato !== null ? (
                              <>
                                <button
                                  className="alimentacion-row-action alimentacion-row-action--imported"
                                  type="button"
                                  aria-label={`Descargar PDF importado v${importedFormato.version} de ${group.fullName}`}
                                  title={`Descargar PDF importado v${importedFormato.version}`}
                                  disabled={downloadingImportedVersionId === importedFormato.id}
                                  onClick={() =>
                                    onDownloadImportedFormato({
                                      adultoMayorId: group.adultoMayorId,
                                      versionId: importedFormato.id,
                                      originalName: importedFormato.originalName,
                                    })
                                  }
                                >
                                  {downloadingImportedVersionId === importedFormato.id ? (
                                    <LoaderCircle
                                      aria-hidden="true"
                                      className="alimentacion-spin"
                                    />
                                  ) : (
                                    <FileDown aria-hidden="true" />
                                  )}
                                </button>
                                <button
                                  className="alimentacion-row-action alimentacion-row-action--imported"
                                  type="button"
                                  aria-label={`Ver versiones de PDF importado de ${group.fullName}`}
                                  title={`PDF importado v${importedFormato.version}: ver historial`}
                                  onClick={() =>
                                    onOpenImportedFormatoHistory({
                                      adultoMayorId: group.adultoMayorId,
                                      fullName: group.fullName,
                                    })
                                  }
                                >
                                  <History aria-hidden="true" />
                                </button>
                              </>
                            ) : null}
                          </>
                        ) : null}
                        <button
                          className="alimentacion-row-action alimentacion-row-action--toggle"
                          type="button"
                          aria-controls={detailRowsRegionId}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? "Ocultar" : "Mostrar"} registros de ${group.fullName}`}
                          title={isExpanded ? "Ocultar registros" : "Mostrar registros"}
                          onClick={() => toggleAdultoRows(group.adultoMayorId)}
                        >
                          <motion.span
                            className="alimentacion-toggle-icon"
                            initial={false}
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                          >
                            <ChevronDown aria-hidden="true" />
                          </motion.span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <AnimatePresence initial={false}>
                    {isExpanded
                      ? group.records.map((record, index) => (
                          <motion.tr
                            key={record.id}
                            className={`alimentacion-detail-row ${index === 0 ? "alimentacion-detail-row--first" : ""}`}
                            id={index === 0 ? detailRowsRegionId : undefined}
                            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                          >
                            <td>{record.documentNumber}</td>
                            <td className="alimentacion-cell-name">
                              <strong>{record.fullName}</strong>
                            </td>
                            <td>{record.deliveryDate}</td>
                            <td>{formatAlimentacionOrganizer(record.organizer)}</td>
                            <td>{formatAlimentacionStatus(record.refrigerio1)}</td>
                            <td>{formatAlimentacionStatus(record.almuerzo)}</td>
                            <td>{formatAlimentacionStatus(record.refrigerio2)}</td>
                            <td>{formatAlimentacionStatus(record.auxilioTransporte)}</td>
                            {showTenantColumn ? <td>{record.tenantName}</td> : null}
                            <td>
                              {canManageAlimentacion ? (
                                <button
                                  className="alimentacion-row-action"
                                  type="button"
                                  aria-label={`Editar alimentación de ${record.fullName} del día ${record.deliveryDate}`}
                                  title="Editar registro"
                                  onClick={() => onOpenEdit(record.id)}
                                >
                                  <Pencil aria-hidden="true" />
                                </button>
                              ) : null}
                            </td>
                          </motion.tr>
                        ))
                      : null}
                  </AnimatePresence>
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
