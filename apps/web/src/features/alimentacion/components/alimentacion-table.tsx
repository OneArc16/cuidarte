import { type AlimentacionListItem } from "@cuidarte/contracts";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  Download,
  FileDown,
  History,
  LoaderCircle,
  Pencil,
  Trash2,
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
    deliveryMonth: string;
    documentNumber: string;
    fullName: string;
  }) => void;
  onImportFormato: (params: {
    adultoMayorId: string;
    deliveryMonth: string;
    documentNumber: string;
    fullName: string;
    hasImportedFormato: boolean;
  }) => void;
  onDownloadImportedFormato: (params: {
    adultoMayorId: string;
    versionId: string;
    originalName: string;
  }) => void;
  onDelete: (record: AlimentacionListItem) => void;
  onOpenImportedFormatoHistory: (params: {
    adultoMayorId: string;
    deliveryMonth: string;
    fullName: string;
  }) => void;
  exportingAdultoMayorId: string | null;
  importingAdultoMayorId: string | null;
  downloadingImportedVersionId: string | null;
};

type AlimentacionGroupedRecord = {
  id: string;
  adultoMayorId: string;
  deliveryMonth: string;
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
  onDelete,
  onOpenImportedFormatoHistory,
  exportingAdultoMayorId,
  importingAdultoMayorId,
  downloadingImportedVersionId,
  records,
  showTenantColumn,
}: AlimentacionTableProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const shouldReduceMotion = useReducedMotion();
  const toggleGroupRows = useCallback((groupId: string) => {
    setExpandedGroupIds((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }

      return next;
    });
  }, []);

  const groupedRecords = useMemo(() => {
    const groupsByAdultoAndMonth = new Map<string, AlimentacionGroupedRecord>();

    for (const record of records) {
      const deliveryMonth = getRecordDeliveryMonth(record);
      const groupId = `${record.adultoMayorId}:${deliveryMonth}`;
      const existingGroup = groupsByAdultoAndMonth.get(groupId);

      if (existingGroup !== undefined) {
        existingGroup.records.push(record);
        continue;
      }

      groupsByAdultoAndMonth.set(groupId, {
        id: groupId,
        adultoMayorId: record.adultoMayorId,
        deliveryMonth,
        documentNumber: record.documentNumber,
        fullName: record.fullName,
        tenantName: record.tenantName,
        records: [record],
      });
    }

    return Array.from(groupsByAdultoAndMonth.values())
      .map((group) => ({
        ...group,
        records: [...group.records].sort((leftRecord, rightRecord) =>
          rightRecord.deliveryDate.localeCompare(leftRecord.deliveryDate),
        ),
      }))
      .sort((left, right) => {
        const nameComparison = left.fullName.localeCompare(right.fullName, "es", {
          sensitivity: "base",
        });

        if (nameComparison !== 0) {
          return nameComparison;
        }

        return right.deliveryMonth.localeCompare(left.deliveryMonth);
      });
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
              const isExpanded = expandedGroupIds.has(group.id);
              const isExporting = exportingAdultoMayorId === group.adultoMayorId;
              const isImporting = importingAdultoMayorId === group.adultoMayorId;
              const latestRecord = group.records[0];
              const detailRowsRegionId = `alimentacion-registros-${group.id}`;

              if (latestRecord === undefined) {
                return null;
              }

              const detailRecords = group.records.filter(
                (record) => getRecordDeliveryMonth(record) === group.deliveryMonth,
              );
              const importedFormato = latestRecord.importedFormato;

              return (
                <Fragment key={group.id}>
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
                            data-tooltip="Mostrar registros del adulto mayor en el mes"
                            onClick={() => toggleGroupRows(group.id)}
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
                    <td>{group.deliveryMonth}</td>
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
                              className="alimentacion-row-action alimentacion-row-action--export"
                              type="button"
                              aria-label={
                                isExporting
                                  ? `Exportando formato de ${group.fullName}`
                                  : `Exportar formato de ${group.fullName}`
                              }
                              data-tooltip={isExporting ? "Exportando formato..." : "Exportar formato"}
                              disabled={isExporting}
                              onClick={() =>
                                onExportFormato({
                                  adultoMayorId: group.adultoMayorId,
                                  deliveryMonth: group.deliveryMonth,
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
                              className="alimentacion-row-action alimentacion-row-action--import"
                              type="button"
                              aria-label={
                                isImporting
                                  ? `Importando formato diligenciado de ${group.fullName}`
                                  : `Importar formato diligenciado de ${group.fullName}`
                              }
                              data-tooltip={
                                isImporting
                                  ? "Importando formato..."
                                  : "Importar formato diligenciado"
                              }
                              disabled={isImporting}
                              onClick={() =>
                                onImportFormato({
                                  adultoMayorId: group.adultoMayorId,
                                  deliveryMonth: group.deliveryMonth,
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
                                  data-tooltip={`Descargar PDF importado v${importedFormato.version}`}
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
                                  data-tooltip={`PDF importado v${importedFormato.version}: ver historial`}
                                  onClick={() =>
                                    onOpenImportedFormatoHistory({
                                      adultoMayorId: group.adultoMayorId,
                                      deliveryMonth: group.deliveryMonth,
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
                          data-tooltip={isExpanded ? "Ocultar registros" : "Mostrar registros"}
                          onClick={() => toggleGroupRows(group.id)}
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
                      ? detailRecords.map((record, index) => (
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
                                  data-tooltip="Editar registro"
                                  onClick={() => onOpenEdit(record.id)}
                                >
                                  <Pencil aria-hidden="true" />
                                </button>
                              ) : null}
                              {record.canDelete ? (
                                <button
                                  className="alimentacion-row-action alimentacion-row-action--danger"
                                  type="button"
                                  aria-label={`Eliminar alimentación de ${record.fullName} del día ${record.deliveryDate}`}
                                  data-tooltip="Eliminar registro"
                                  onClick={() => onDelete(record)}
                                >
                                  <Trash2 aria-hidden="true" />
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

function getRecordDeliveryMonth(record: AlimentacionListItem): string {
  return record.deliveryDate.slice(0, 7);
}
