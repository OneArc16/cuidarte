import { type PsicologiaAdultoResumen } from "@cuidarte/contracts";

import { formatAdultoMayorDocument } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
export function PsicologiaAdultoSummary({ adulto }: { adulto: PsicologiaAdultoResumen }) {
  return (
    <section className="psicologia-summary" aria-label="Resumen del adulto mayor">
      <div>
        <span className="eyebrow">Adulto mayor</span>
        <h2>{adulto.fullName}</h2>
      </div>
      <dl>
        <div>
          <dt>Documento</dt>
          <dd>{formatAdultoMayorDocument(adulto.documentType, adulto.documentNumber)}</dd>
        </div>
        <div>
          <dt>Centro</dt>
          <dd>{adulto.tenantName}</dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{adulto.age}</dd>
        </div>
        <div>
          <dt>EPS</dt>
          <dd>{adulto.eps ?? "Sin dato"}</dd>
        </div>
      </dl>
    </section>
  );
}
