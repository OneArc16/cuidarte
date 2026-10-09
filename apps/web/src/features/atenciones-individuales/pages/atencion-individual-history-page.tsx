import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, HeartPulse } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";

import { HistoriaClinicaTable } from "../components/historia-clinica-table";
import { resolveAtencionIndividualApiError } from "../lib/atenciones-individuales-formatters";
import {
  buildAtencionIndividualCreatePath,
  buildAtencionIndividualDetailPath,
} from "../lib/atenciones-individuales-paths";
import { canCreateAtencionIndividual } from "../lib/historia-clinica-permissions";
import {
  useHistoriaClinicaQuery,
  useMedicalHistoriaClinicaQuery,
} from "../model/atenciones-individuales-queries";

type AtencionIndividualHistoryPageProps = {
  adultoMayorId: string;
  historyType?: "clinical" | "medical";
  navigate: Navigate;
  user: AuthUser;
};

export function AtencionIndividualHistoryPage({
  adultoMayorId,
  historyType = "clinical",
  navigate,
  user,
}: AtencionIndividualHistoryPageProps) {
  const clinicalHistoryQuery = useHistoriaClinicaQuery(adultoMayorId, historyType === "clinical");
  const medicalHistoryQuery = useMedicalHistoriaClinicaQuery(
    adultoMayorId,
    historyType === "medical",
  );
  const historyQuery = historyType === "medical" ? medicalHistoryQuery : clinicalHistoryQuery;
  const canCreate = canCreateAtencionIndividual(user);
  const historyLabel = historyType === "medical" ? "Historia médica" : "Historia clinica";

  if (historyQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">{historyLabel}</p>
        <h2>Cargando {historyLabel.toLowerCase()}...</h2>
      </section>
    );
  }

  if (historyQuery.isError || historyQuery.data === undefined) {
    return (
      <section className="adultos-empty" aria-labelledby="historia-clinica-error-title">
        <p className="eyebrow">{historyLabel}</p>
        <h2 id="historia-clinica-error-title">No fue posible cargar la historia</h2>
        <p>{resolveAtencionIndividualApiError(historyQuery.error)}</p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const { adultoMayor, atenciones } = historyQuery.data;

  return (
    <section className="adultos-form-stack" aria-labelledby="historia-clinica-title">
      <h1 className="visually-hidden" id="historia-clinica-title">
        {historyLabel} del adulto mayor
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="adultos-form-nav__context">{historyLabel}</span>
      </div>

      <section className="atencion-patient-summary" aria-label="Resumen del adulto mayor">
        <div>
          <span className="eyebrow">Adulto mayor</span>
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
          <h2>{historyType === "medical" ? "Seguimiento médico" : "Seguimiento clinico"}</h2>
          <p>
            {canCreate
              ? "Aqui puedes revisar tus atenciones y retomar su edicion sin duplicar formularios."
              : "Aqui puedes revisar las atenciones registradas por el equipo clinico en modo de solo lectura."}
          </p>
        </div>
        {canCreate ? (
          <button
            className="outline-action atencion-history-create"
            type="button"
            onClick={() => navigate(buildAtencionIndividualCreatePath(adultoMayorId))}
          >
            <HeartPulse aria-hidden="true" />
            <span>Nueva atencion</span>
          </button>
        ) : null}
      </div>

      <HistoriaClinicaTable
        atenciones={atenciones}
        isLoading={false}
        onOpenAtencion={(atencion) =>
          navigate(buildAtencionIndividualDetailPath(adultoMayorId, atencion.id))
        }
      />
    </section>
  );
}
