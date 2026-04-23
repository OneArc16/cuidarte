import { FileSpreadsheet, FileText, Printer, Search } from "lucide-react";

type AdultosMayoresToolbarProps = {
  search: string;
  isExporting: boolean;
  onSearchChange: (search: string) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onPrint: () => void;
};

export function AdultosMayoresToolbar({
  isExporting,
  onExportExcel,
  onExportPdf,
  onPrint,
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
        <button
          className="adultos-export-action"
          type="button"
          aria-label="Exportar a Excel"
          title="Exportar a Excel"
          disabled={isExporting}
          onClick={onExportExcel}
        >
          <FileSpreadsheet aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action"
          type="button"
          aria-label="Exportar a PDF"
          title="Exportar a PDF"
          disabled={isExporting}
          onClick={onExportPdf}
        >
          <FileText aria-hidden="true" />
        </button>
        <button
          className="adultos-export-action"
          type="button"
          aria-label="Imprimir listado"
          title="Imprimir listado"
          onClick={onPrint}
        >
          <Printer aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
