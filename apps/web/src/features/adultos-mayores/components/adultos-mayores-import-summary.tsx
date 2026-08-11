import { type AdultoMayorImportDetail } from "@cuidarte/contracts";

type AdultosMayoresImportSummaryProps = {
  detail: AdultoMayorImportDetail;
};

export function AdultosMayoresImportSummary({ detail }: AdultosMayoresImportSummaryProps) {
  const isCompleted = detail.status === "completed";
  const createdRows = isCompleted ? detail.summary.createdRows : detail.summary.readyRows;
  const updatedRows = isCompleted ? detail.summary.updatedRows : detail.summary.updateRows;

  return (
    <section className="import-summary" aria-labelledby="import-summary-title">
      <div className="import-summary__header">
        <div>
          <span className="eyebrow">Resultado</span>
          <h2 id="import-summary-title">Resumen de validacion</h2>
        </div>
        <p className="import-summary__tenant">{detail.tenant.name}</p>
      </div>

      <div className="import-summary__grid">
        <article>
          <span>Filas leidas</span>
          <strong>{detail.summary.totalRows}</strong>
        </article>
        <article>
          <span>{isCompleted ? "Creadas" : "Listas para crear"}</span>
          <strong>{createdRows}</strong>
        </article>
        <article>
          <span>{isCompleted ? "Actualizadas" : "Listas para actualizar"}</span>
          <strong>{updatedRows}</strong>
        </article>
        <article>
          <span>Sin cambios</span>
          <strong>{detail.summary.unchangedRows}</strong>
        </article>
        <article>
          <span>Con advertencias</span>
          <strong>{detail.summary.warningRows}</strong>
        </article>
        <article>
          <span>Con errores</span>
          <strong>{detail.summary.invalidRows}</strong>
        </article>
      </div>

      <p
        className={
          detail.canConfirm || isCompleted
            ? "import-summary__status"
            : "import-summary__status import-summary__status--warning"
        }
      >
        {isCompleted
          ? "La importacion se completo correctamente."
          : detail.canConfirm
            ? "El lote esta listo para confirmar."
            : "Corrige los errores antes de confirmar la importacion."}
      </p>
    </section>
  );
}
