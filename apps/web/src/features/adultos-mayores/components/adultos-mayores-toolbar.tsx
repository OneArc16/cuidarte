import { FileSpreadsheet, FileText, Printer, Search, Trash2, Upload } from "lucide-react";

type AdultosMayoresToolbarProps = {
  canImportAdultosMayores: boolean;
  canManageTrash: boolean;
  search: string;
  isExporting: boolean;
  onSearchChange: (search: string) => void;
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
  search,
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

      <div className="adultos-export-actions" aria-label="Exportaciones">
        {canImportAdultosMayores ? (
          <button
            className="adultos-export-action adultos-export-action--import"
            type="button"
            aria-label="Importar adultos mayores"
            title="Importar adultos mayores"
            onClick={onImportAdultosMayores}
          >
            <Upload aria-hidden="true" />
          </button>
        ) : null}
        <button
          className="adultos-export-action adultos-export-action--excel"
          type="button"
          aria-label="Exportar a Excel"
          title="Exportar a Excel"
          disabled={isExporting}
          onClick={onExportExcel}
        >
          <FileSpreadsheet aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action adultos-export-action--pdf"
          type="button"
          aria-label="Exportar a PDF"
          title="Exportar a PDF"
          disabled={isExporting}
          onClick={onExportPdf}
        >
          <FileText aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action adultos-export-action--print"
          type="button"
          aria-label="Imprimir listado"
          title="Imprimir listado"
          onClick={onPrint}
        >
          <Printer aria-hidden="true" />
        </button>
        {canManageTrash ? (
          <button
            className="adultos-export-action adultos-export-action--trash"
            type="button"
            aria-label="Papelera"
            title="Papelera"
            onClick={onOpenTrash}
          >
            <Trash2 aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </section>
  );
}
