import { type AdultoMayorAttentionFilter } from "@cuidarte/contracts";
import { FileSpreadsheet, FileText, Printer, Search, Trash2, Upload } from "lucide-react";

type AdultosMayoresToolbarProps = {
  canImportAdultosMayores: boolean;
  canManageTrash: boolean;
  search: string;
  attentionType: AdultoMayorAttentionFilter;
  isExporting: boolean;
  onSearchChange: (search: string) => void;
  onAttentionTypeChange: (attentionType: AdultoMayorAttentionFilter) => void;
  onImportAdultosMayores: () => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
  onOpenTrash: () => void;
};

export function AdultosMayoresToolbar({
  canImportAdultosMayores,
  canManageTrash,
  isExporting,
  onExportExcel,
  onExportPdf,
  onPrint,
  onOpenTrash,
  onImportAdultosMayores,
  onSearchChange,
  onAttentionTypeChange,
  search,
  attentionType,
}: AdultosMayoresToolbarProps) {
  return (
    <section className="adultos-toolbar" aria-label="Herramientas del listado">
      <label className="adultos-search">
        <span>Buscar adulto mayor</span>
        <div className="adultos-search__control">
          <Search aria-hidden="true" />
          <input
            value={search}
            placeholder="Documento, nombres, apellidos o telefono"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>

      <label className="adultos-attention-filter">
        <span>Atenciones registradas</span>
        <select
          value={attentionType}
          onChange={(event) =>
            onAttentionTypeChange(event.target.value as AdultoMayorAttentionFilter)
          }
        >
          <option value="all">Todas las personas</option>
          <option value="medical">Con atención médica</option>
          <option value="nursing">Con atención de enfermería</option>
        </select>
      </label>

      <div className="adultos-export-actions" aria-label="Exportaciones">
        {canImportAdultosMayores ? (
          <button
            className="adultos-export-action adultos-export-action--import"
            type="button"
            aria-label="Importar adultos mayores"
            data-tooltip="Importar adultos mayores"
            onClick={onImportAdultosMayores}
          >
            <Upload aria-hidden="true" />
          </button>
        ) : null}
        <button
          className="adultos-export-action adultos-export-action--excel"
          type="button"
          aria-label="Exportar a Excel"
          data-tooltip="Exportar a Excel"
          disabled={isExporting}
          onClick={onExportExcel}
        >
          <FileSpreadsheet aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action adultos-export-action--pdf"
          type="button"
          aria-label="Exportar a PDF"
          data-tooltip="Exportar a PDF"
          disabled={isExporting}
          onClick={onExportPdf}
        >
          <FileText aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action adultos-export-action--print"
          type="button"
          aria-label="Imprimir listado"
          data-tooltip="Imprimir listado"
          onClick={onPrint}
        >
          <Printer aria-hidden="true" />
        </button>
        {canManageTrash ? (
          <button
            className="adultos-export-action adultos-export-action--trash"
            type="button"
            aria-label="Papelera"
            data-tooltip="Papelera"
            onClick={onOpenTrash}
          >
            <Trash2 aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
