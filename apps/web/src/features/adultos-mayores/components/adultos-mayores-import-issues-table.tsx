import { type AdultoMayorImportIssue } from "@cuidarte/contracts";

type AdultosMayoresImportIssuesTableProps = {
  issues: AdultoMayorImportIssue[];
};

export function AdultosMayoresImportIssuesTable({ issues }: AdultosMayoresImportIssuesTableProps) {
  const visibleIssues = issues.slice(0, 100);

  return (
    <section className="import-issues" aria-labelledby="import-issues-title">
      <div className="import-issues__header">
        <div>
          <span className="eyebrow">Problemas</span>
          <h2 id="import-issues-title">Errores y advertencias</h2>
        </div>
        <p>{issues.length > visibleIssues.length ? `Mostrando ${visibleIssues.length} de ${issues.length}.` : `${issues.length} problemas.`}</p>
      </div>

      <div className="import-issues__table-wrap">
        <table className="import-issues__table">
          <thead>
            <tr>
              <th scope="col">Fila</th>
              <th scope="col">Columna</th>
              <th scope="col">Severidad</th>
              <th scope="col">Codigo</th>
              <th scope="col">Valor</th>
              <th scope="col">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {visibleIssues.length === 0 ? (
              <tr>
                <td colSpan={6}>No hay problemas para mostrar.</td>
              </tr>
            ) : (
              visibleIssues.map((issue) => (
                <tr key={`${issue.rowNumber}-${issue.column}-${issue.code}-${issue.message}`}>
                  <td>{issue.rowNumber}</td>
                  <td>{issue.column}</td>
                  <td>
                    <span
                      className={
                        issue.severity === "error"
                          ? "import-issues__badge import-issues__badge--error"
                          : "import-issues__badge import-issues__badge--warning"
                      }
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td>{issue.code}</td>
                  <td>{issue.receivedValue ?? "—"}</td>
                  <td>{issue.message}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
