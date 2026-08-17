import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionesEnfermeriaHistoryTable } from "../components/atenciones-enfermeria-history-table";
import { resolveAtencionesEnfermeriaApiError } from "../lib/atenciones-enfermeria-formatters";
import {
  ATENCIONES_ENFERMERIA_PATH,
  buildAtencionEnfermeriaDetailPath,
} from "../lib/atenciones-enfermeria-paths";
import { useAtencionesEnfermeriaHistoryQuery } from "../model/atenciones-enfermeria-queries";

type AtencionesEnfermeriaHistoryPageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function AtencionesEnfermeriaHistoryPage({
  adultoMayorId,
  navigate,
}: AtencionesEnfermeriaHistoryPageProps) {
  const historyQuery = useAtencionesEnfermeriaHistoryQuery(adultoMayorId);

  if (historyQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">Historia de enfermería</p>
        <h2>Cargando historia de enfermería...</h2>
      </section>
    );
  }

  if (historyQuery.isError || historyQuery.data === undefined) {
    return (
      <section className="adultos-empty" aria-labelledby="atenciones-enfermeria-history-error-title">
        <p className="eyebrow">Historia de enfermería</p>
        <h2 id="atenciones-enfermeria-history-error-title">No fue posible cargar la historia</h2>
        <p>{resolveAtencionesEnfermeriaApiError(historyQuery.error)}</p>
        <button className="outline-action" type="button" onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const { adultoMayor, atenciones } = historyQuery.data;

  return (
    <section className="adultos-form-stack" aria-labelledby="atenciones-enfermeria-history-title">
      <h1 className="visually-hidden" id="atenciones-enfermeria-history-title">
        Historia de enfermería del adulto mayor
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>

        <span className="adultos-form-nav__context">Historia de enfermería</span>
      </div>

      <section className="atencion-patient-summary" aria-label="Resumen del adulto mayor">
        <div>
          <span className="eyebrow">Historia compartida</span>
          <h2>{adultoMayor.fullName}</h2>
        </div>
        <dl>
          <div>
            <dt>Documento</dt>
            <dd>{adultoMayor.documentNumber}</dd>
          </div>
          <div>
            <dt>Edad</dt>
            <dd>{adultoMayor.age}</dd>
          </div>
          <div>
            <dt>Centro</dt>
            <dd>{adultoMayor.tenantName}</dd>
          </div>
          <div>
            <dt>EPS</dt>
            <dd>{adultoMayor.eps ?? "Sin dato"}</dd>
          </div>
        </dl>
      </section>

      <div className="atencion-history-header">
        <div>
          <span className="eyebrow">Atenciones registradas</span>
        </div>
      </div>

      <AtencionesEnfermeriaHistoryTable
        atenciones={atenciones}
        isLoading={false}
        onOpenAtencion={(atencionId) => {
          navigate(buildAtencionEnfermeriaDetailPath(atencionId));
        }}
      />
    </section>
  );
}
