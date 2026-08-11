import { type AdultoMayorImportDetail } from "@cuidarte/contracts";

type AdultosMayoresImportConfirmationProps = {
  detail: AdultoMayorImportDetail;
  isPending: boolean;
  onConfirm: () => void;
};

export function AdultosMayoresImportConfirmation({
  detail,
  isPending,
  onConfirm,
}: AdultosMayoresImportConfirmationProps) {
  const isCompleted = detail.status === "completed";

  return (
    <section className="import-confirmation" aria-labelledby="import-confirmation-title">
      <div>
        <span className="eyebrow">Confirmacion</span>
        <h2 id="import-confirmation-title">
          {isCompleted ? "Importacion completada" : "Importacion lista"}
        </h2>
      </div>

      <dl className="import-confirmation__grid">
        <div>
          <dt>Centro</dt>
          <dd>{detail.tenant.name}</dd>
        </div>
        <div>
          <dt>Nuevos</dt>
          <dd>{isCompleted ? detail.summary.createdRows : detail.summary.readyRows}</dd>
        </div>
        <div>
          <dt>Por actualizar</dt>
          <dd>{isCompleted ? detail.summary.updatedRows : detail.summary.updateRows}</dd>
        </div>
        <div>
          <dt>Sin cambios</dt>
          <dd>{detail.summary.unchangedRows}</dd>
        </div>
      </dl>

      {isCompleted ? null : (
        <button
          className="primary-action import-primary-action"
          type="button"
          disabled={!detail.canConfirm || isPending}
          onClick={onConfirm}
        >
          {isPending ? "Confirmando..." : "Confirmar importacion"}
        </button>
      )}
    </section>
  );
}
