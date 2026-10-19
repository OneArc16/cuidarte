import { type AlimentacionListItem } from "@cuidarte/contracts";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChevronDown,
  Download,
  FileDown,
  History,
  ListChecks,
  LoaderCircle,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import {
  formatAlimentacionOrganizer,
  formatAlimentacionStatus,
} from "../lib/alimentacion-formatters";

type AlimentacionTableProps = {
  canManageAlimentacion: boolean;
  canExportFormato: boolean;
  canImportFormato: boolean;
  isLoading: boolean;
  records: AlimentacionListItem[];
  showDeliveredDays: boolean;
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
  onDeleteRecords: (params: { fullName: string; recordIds: string[] }) => void;
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
  canExportFormato,
  canImportFormato,
  isLoading,
  onOpenEdit,
  onExportFormato,
  onImportFormato,
  onDownloadImportedFormato,
  onDeleteRecords,
  onOpenImportedFormatoHistory,
  exportingAdultoMayorId,
  importingAdultoMayorId,
  downloadingImportedVersionId,
  records,
  showDeliveredDays,
  showTenantColumn,
}: AlimentacionTableProps) {
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [selectedRecordIds, setSelectedRecordIds] = useState<Set<string>>(new Set());
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

  useEffect(() => {
    const availableIds = new Set(
      records.filter((record) => record.canDelete).map((record) => record.id),
    );

    setSelectedRecordIds((current) => {
      const next = new Set([...current].filter((id) => availableIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [records]);

  function toggleRecordSelection(recordId: string) {
    setSelectedRecordIds((current) => {
      const next = new Set(current);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }

  function toggleGroupSelection(recordsToToggle: AlimentacionListItem[]) {
    const deletableIds = recordsToToggle
      .filter((record) => record.canDelete)
      .map((record) => record.id);
    const areAllSelected = deletableIds.length > 0 && deletableIds.every((id) => selectedRecordIds.has(id));

    setSelectedRecordIds((current) => {
      const next = new Set(current);
      for (const id of deletableIds) {
        if (areAllSelected) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      return next;
    });
  }

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

  const columnCount = 9 + Number(showTenantColumn) + Number(showDeliveredDays);

  return (
    <div className="alimentacion-table-wrap">
      <table
        className={`alimentacion-table ${showTenantColumn ? "alimentacion-table--with-tenant" : "alimentacion-table--without-tenant"}`}
      >
        <colgroup>
          <col className="alimentacion-col-documento" />
          <col className="alimentacion-col-nombre" />
          <col className="alimentacion-col-fecha" />
          {showDeliveredDays ? <col className="alimentacion-col-dias-entregados" /> : null}
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
            {showDeliveredDays ? (
              <th className="alimentacion-cell-dias-entregados" scope="col">
                Días entregados
              </th>
            ) : null}
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
              const deletableDetailRecords = detailRecords.filter((record) => record.canDelete);
              const selectedDetailIds = deletableDetailRecords
                .filter((record) => selectedRecordIds.has(record.id))
                .map((record) => record.id);
              const areAllDetailRecordsSelected =
                deletableDetailRecords.length > 0 &&
                selectedDetailIds.length === deletableDetailRecords.length;
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
                    {showDeliveredDays ? (
                      <td className="alimentacion-cell-dias-entregados">
                        <strong>{countDeliveredDays(group.records)}</strong>
                      </td>
                    ) : null}
                    <td>{formatAlimentacionOrganizer(latestRecord.organizer)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.refrigerio1)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.almuerzo)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.refrigerio2)}</td>
                    <td>{formatAlimentacionStatus(latestRecord.auxilioTransporte)}</td>
                    {showTenantColumn ? <td>{group.tenantName}</td> : null}
                    <td>
                      <div className="alimentacion-table-row-actions">
                        {canManageAlimentacion || canExportFormato || canImportFormato ? (
                          <>
                            {canExportFormato ? (
                              <button
                                className="alimentacion-row-action alimentacion-row-action--export"
                                type="button"
                                aria-label={
                                  isExporting
                                    ? `Exportando formato de ${group.fullName}`
                                    : `Exportar formato de ${group.fullName}`
                                }
                                data-tooltip={
                                  isExporting ? "Exportando formato..." : "Exportar formato"
                                }
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
                            ) : null}
                            {canImportFormato ? (
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
                            ) : null}
                            {importedFormato !== null &&
                            (canExportFormato || canManageAlimentacion) ? (
                              <>
                                {canExportFormato ? (
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
                                ) : null}
                                {canManageAlimentacion ? (
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
                                ) : null}
                              </>
                            ) : null}
                            {deletableDetailRecords.length > 0 ? (
                              <>
                                <button
                                  className="alimentacion-row-action alimentacion-row-action--select"
                                  type="button"
                                  aria-label={`${areAllDetailRecordsSelected ? "Quitar selección de" : "Seleccionar todos los"} días de ${group.fullName}`}
                                  data-tooltip={
                                    areAllDetailRecordsSelected
                                      ? "Quitar selección"
                                      : "Seleccionar todos los días"
                                  }
                                  onClick={() => toggleGroupSelection(detailRecords)}
                                >
                                  <ListChecks aria-hidden="true" />
                                </button>
                                <button
                                  className="alimentacion-row-action alimentacion-row-action--danger"
                                  type="button"
                                  aria-label={`Eliminar ${selectedDetailIds.length} días de alimentación de ${group.fullName}`}
                                  data-tooltip={
                                    selectedDetailIds.length === 0
                                      ? "Selecciona días para eliminar"
                                      : `Eliminar ${selectedDetailIds.length} días seleccionados`
                                  }
                                  disabled={selectedDetailIds.length === 0}
                                  onClick={() => {
                                    onDeleteRecords({
                                      fullName: group.fullName,
                                      recordIds: selectedDetailIds,
                                    });
                                    setSelectedRecordIds((current) => {
                                      const next = new Set(current);
                                      for (const id of selectedDetailIds) next.delete(id);
                                      return next;
                                    });
                                  }}
                                >
                                  <Trash2 aria-hidden="true" />
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
                            {showDeliveredDays ? (
                              <td
                                aria-label="Detalle por día"
                                className="alimentacion-cell-dias-entregados"
                              >
                                —
                              </td>
                            ) : null}
                            <td>{formatAlimentacionOrganizer(record.organizer)}</td>
                            <td>{formatAlimentacionStatus(record.refrigerio1)}</td>
                            <td>{formatAlimentacionStatus(record.almuerzo)}</td>
                            <td>{formatAlimentacionStatus(record.refrigerio2)}</td>
                            <td>{formatAlimentacionStatus(record.auxilioTransporte)}</td>
                            {showTenantColumn ? <td>{record.tenantName}</td> : null}
                            <td>
                              <div className="alimentacion-table-row-actions">
                                {record.canDelete ? (
                                  <label
                                    className="alimentacion-detail-select"
                                    title="Seleccionar día para eliminar"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedRecordIds.has(record.id)}
                                      aria-label={`Seleccionar el día ${record.deliveryDate} de ${record.fullName}`}
                                      onChange={() => toggleRecordSelection(record.id)}
                                    />
                                  </label>
                                ) : null}
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
                              </div>
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

function countDeliveredDays(records: AlimentacionListItem[]): number {
  return records.filter((record) =>
    [record.refrigerio1, record.almuerzo, record.refrigerio2, record.auxilioTransporte].some(
      (status) => status === "entregado",
    ),
  ).length;
}
