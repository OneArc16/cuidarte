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
  return (
    <section className="import-confirmation" aria-labelledby="import-confirmation-title">
      <div>
        <span className="eyebrow">Confirmacion</span>
        <h2 id="import-confirmation-title">Importacion lista</h2>
      </div>

      <dl className="import-confirmation__grid">
        <div>
          <dt>Centro</dt>
          <dd>{detail.tenant.name}</dd>
        </div>
        <div>
          <dt>Nuevos</dt>
          <dd>{detail.summary.readyRows}</dd>
        </div>
        <div>
          <dt>Omitidos</dt>
          <dd>{detail.summary.existingRows}</dd>
        </div>
      </dl>

      <button
        className="primary-action import-primary-action"
        type="button"
        disabled={!detail.canConfirm || isPending}
        onClick={onConfirm}
      >
        {isPending ? "Confirmando..." : "Confirmar importacion"}
      </button>
    </section>
  );
}
