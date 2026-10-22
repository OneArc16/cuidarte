-- Los gráficos del tablero se controlan por persona y se reutilizan para PDF y PowerPoint.
INSERT INTO "user_permissions" ("user_id", "permission")
SELECT DISTINCT existing."user_id", chart."permission"
FROM "user_permissions" AS existing
INNER JOIN "users" AS "user" ON "user"."id" = existing."user_id"
CROSS JOIN (
  VALUES
    ('reportes.chart.monthly_attendances'),
    ('reportes.chart.activities_by_type'),
    ('reportes.chart.monthly_deliveries'),
    ('reportes.chart.sex_distribution'),
    ('reportes.chart.rations_by_month'),
    ('reportes.chart.transport_by_month')
) AS chart("permission")
WHERE existing."permission" = 'reportes.view'
  -- Los auditores existentes conservan inicialmente la restricción del gráfico mensual.
  -- El permiso sigue siendo administrable por persona desde Gestión de empleados.
  AND (
    "user"."role" <> 'auditor'
    OR chart."permission" <> 'reportes.chart.monthly_attendances'
  )
ON CONFLICT ("user_id", "permission") DO NOTHING;
--> statement-breakpoint

-- Una exportación en cola conserva los permisos con los que fue solicitada.
ALTER TABLE "report_analytics_exports"
ADD COLUMN "requested_by_permissions" jsonb NOT NULL DEFAULT '[]'::jsonb;
