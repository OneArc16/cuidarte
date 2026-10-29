import { type NutricionAdultoResumen } from "@cuidarte/contracts";

type NutricionAdultoSummaryProps = {
  adultoMayor: NutricionAdultoResumen;
};

export function NutricionAdultoSummary({ adultoMayor }: NutricionAdultoSummaryProps) {
  return (
    <section
      className="nutricion-summary nutricion-summary--adulto"
      aria-label="Resumen del adulto mayor"
    >
      <div className="nutricion-summary__identity">
        <span className="eyebrow">Adulto mayor</span>
        <h2>{adultoMayor.fullName}</h2>
      </div>
      <dl className="nutricion-summary__grid">
        <div>
          <dt>Documento</dt>
          <dd>{adultoMayor.documentNumber}</dd>
        </div>
        <div>
          <dt>Centro</dt>
          <dd>{adultoMayor.tenantName}</dd>
        </div>
        <div>
          <dt>Edad</dt>
          <dd>{adultoMayor.age}</dd>
        </div>
        <div>
          <dt>EPS</dt>
          <dd>{adultoMayor.eps ?? "Sin dato"}</dd>
        </div>
      </dl>
    </section>
  );
}
