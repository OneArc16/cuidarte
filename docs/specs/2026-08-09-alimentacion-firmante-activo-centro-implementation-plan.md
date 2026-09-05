# PLAN: Implementacion Tecnica de Firmante Activo del Centro

- Estado: proposed
- Fecha: 2026-08-09
- Tipo: implementation-plan
- Base funcional:
  - `docs/specs/2026-08-09-alimentacion-firmante-activo-centro.spec.md`
  - `docs/specs/2026-08-09-alimentacion-firmante-activo-centro-v2.spec.md`
- Modulos impactados:
  - `packages/contracts`
  - `apps/api/src/database`
  - `apps/api/src/modules/empleados`
  - `apps/api/src/modules/alimentacion`
  - `apps/web/src/features/empleados`

## 1. Objetivo del plan

Traducir el cambio de negocio de `vigencia por fecha` a `firmante activo del centro` en un plan tecnico ejecutable, con:

1. archivos exactos a tocar;
2. orden recomendado de implementacion;
3. puntos de migracion de datos;
4. riesgos reales del repo actual;
5. criterios de salida por fase.

## 2. Recomendacion tecnica principal

La mejor recomendacion para este repo es:

1. **no reutilizar la tabla de vigencias como semantica principal**;
2. **agregar una nueva fuente de verdad para el firmante activo**;
3. **dejar la tabla historica actual solo como insumo de migracion y auditoria**;
4. **resolver el PDF de alimentacion contra el firmante activo, no contra una fecha**.

No recomiendo mutar el significado de `tenantDirectorSignatureAssignments` dentro de [schema.ts](/home/daniel/cuidarte/apps/api/src/database/schema.ts), porque mezclaria dos modelos mentales distintos en la misma estructura y nos puede volver a traer ambiguedades.

## 3. Decision de arquitectura

### 3.1 Modulo dueno

El modulo dueno del nuevo concepto debe seguir siendo `empleados`, no `alimentacion`.

Motivo:

1. las firmas versionadas ya viven en `empleados`;
2. la resolucion del director firmante ya vive en `empleados-signature.service.ts`;
3. `alimentacion` debe ser consumidor de solo lectura del firmante activo;
4. el panel operativo actual ya vive en [empleado-director-signature-panel.tsx](/home/daniel/cuidarte/apps/web/src/features/empleados/components/empleado-director-signature-panel.tsx).

### 3.2 Recurso nuevo

Agregar un recurso de dominio nuevo, por ejemplo:

- `tenant_active_signers`

Responsabilidad:

1. definir el firmante activo actual por centro;
2. apuntar a un `employeeId`;
3. apuntar a un `signatureVersionId`;
4. guardar metadata de activacion.

### 3.3 Historia vs operacion

Separar explicitamente:

1. `employee_signature_versions`: historial de archivos;
2. `tenant_active_signers`: fuente operativa actual;
3. `tenantDirectorSignatureAssignments`: historial legacy y migracion;
4. `alimentacion_formato_emissions`: snapshot documental.

## 4. Workstreams

## 4.1 Workstream A - Contratos compartidos

### Archivos

1. [empleados.ts](/home/daniel/cuidarte/packages/contracts/src/empleados.ts)
2. [index.ts](/home/daniel/cuidarte/packages/contracts/src/index.ts)

### Cambios

1. Remover del flujo principal el contrato `assignEmpleadoDirectorSignatureRequestSchema` con `effectiveFrom`.
2. Introducir contratos nuevos para:
   - `EmpleadoActiveSigner`
   - `EmpleadoActiveSignerHistoryItem` o equivalente si se expone historial nuevo
   - `SetTenantActiveSignerRequest`
3. Ajustar `empleadoDetailSchema` para dejar de depender de:
   - `currentDirectorSignatureAssignment`
   - `directorSignatureAssignmentHistory`
4. Incorporar campos nuevos orientados a UX:
   - `currentTenantActiveSigner`
   - `isCurrentTenantActiveSigner` en el empleado actual si se decide simplificar la UI
   - `latestSignature`

### Nota de implementacion

La recomendacion mas limpia es no seguir exponiendo `effectiveFrom/effectiveTo` en el contrato principal del panel.

## 4.2 Workstream B - Base de datos y migracion

### Archivos

1. [schema.ts](/home/daniel/cuidarte/apps/api/src/database/schema.ts)
2. archivos de migracion de Drizzle que se generen desde `apps/api`

### Cambios

1. Agregar tabla nueva, sugerida:
   - `tenant_active_signers`
2. Campos sugeridos:
   - `tenant_id`
   - `employee_id`
   - `signature_version_id`
   - `activated_by_user_id`
   - `activated_at`
   - `updated_at`
3. Agregar restricciones:
   - PK o unique por `tenant_id`
   - FK a `users.id`
   - FK a `employee_signature_versions.id`
   - validacion de pertenencia por aplicacion y repositorio
4. No borrar `tenantDirectorSignatureAssignments` en esta fase.
5. Mantener `alimentacionFormatoEmissions` como snapshot historico tal como ya existe.

### Estrategia de migracion de datos

1. leer la ultima asignacion de `tenantDirectorSignatureAssignments` por `tenantId`;
2. poblar `tenant_active_signers` con esa ultima asignacion;
3. si la firma o empleado no existen, registrar inconsistencia;
4. no tocar emisiones historicas existentes.

### Salida esperada

El sistema puede resolver un firmante activo por centro sin depender de `effectiveFrom`.

## 4.3 Workstream C - Dominio y repositorio de empleados

### Archivos

1. [empleado.types.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/domain/empleado.types.ts)
2. [empleados.repository.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/domain/empleados.repository.ts)
3. [drizzle-empleados.repository.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/infrastructure/drizzle-empleados.repository.ts)

### Cambios

1. Agregar tipos de dominio nuevos:
   - `TenantActiveSignerRecord`
   - `SetTenantActiveSignerCommand`
2. Ajustar `EmpleadoRecord` para exponer:
   - el firmante activo actual del centro;
   - indicador de si este empleado es el firmante activo.
3. Agregar queries de repositorio:
   - `findTenantActiveSignerByTenantId`
   - `setTenantActiveSigner`
   - `resolveActiveDirectorSignatureByTenantId`
4. Mantener `resolveDirectorSignatureForDate` solo de forma transitoria o legacy si otras piezas aun la usan.

### Riesgo tecnico actual

Hoy el flujo se apoya en `resolveDirectorSignatureForDate` dentro de [empleados-signature.service.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/application/empleados-signature.service.ts). Ese metodo debe dejar de ser la fuente principal para alimentacion.

## 4.4 Workstream D - Servicio y controller de empleados

### Archivos

1. [empleados-signature.service.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/application/empleados-signature.service.ts)
2. [empleados.service.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/application/empleados.service.ts)
3. [empleados.controller.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/presentation/empleados.controller.ts)
4. [empleados.module.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/empleados.module.ts)

### Cambios

1. Agregar caso de uso nuevo:
   - `setTenantActiveSigner(...)`
2. Agregar caso de lectura:
   - `resolveActiveDirectorSignatureByTenantId(...)`
3. Deprecar en el flujo principal:
   - `assignDirectorSignature(...)`
4. Reemplazar endpoint actual:
   - hoy: `POST /empleados/:id/director-signature-assignment`
   - propuesto: `PUT /empleados/:id/active-center-signer`

### Recomendacion de endpoint

Para minimizar impacto de UI y de permisos actuales, recomiendo mantener la accion dentro de `empleados.controller.ts` y no moverla a otro modulo en esta fase.

Motivos:

1. el panel actual ya opera sobre un `empleadoId`;
2. el detalle del director ya esta cargado en pantalla;
3. evita abrir una segunda superficie administrativa solo para este cambio.

## 4.5 Workstream E - Exportador de alimentacion

### Archivos

1. [alimentacion-formato-export.service.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.ts)
2. [alimentacion.service.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/application/alimentacion.service.ts)
3. [alimentacion.types.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/domain/alimentacion.types.ts)
4. [drizzle-alimentacion.repository.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/infrastructure/drizzle-alimentacion.repository.ts)

### Cambios

1. Cambiar la resolucion de firma:
   - hoy: `resolveDirectorSignatureForDate(tenantId, effectiveDate)`
   - propuesto: `resolveActiveDirectorSignatureByTenantId(tenantId)`
2. Eliminar del flujo principal cualquier dependencia funcional de `signatureEffectiveDate`.
3. Mantener `issuedAt` solo para snapshot y auditoria.
4. Seguir guardando snapshot en `alimentacion_formato_emissions`.
5. Mantener la regla de reuso:
   - si cambia firmante activo, reemitir;
   - si cambia firma activa, reemitir;
   - si cambia logo activo, reemitir;
   - si cambia fuente de registros, reemitir.

### Decision recomendada

No recomiendo dejar una doble logica duradera en `alimentacion-formato-export.service.ts`. La transicion puede existir en una fase corta, pero el objetivo final debe ser una sola fuente de verdad.

## 4.6 Workstream F - API web de empleados

### Archivos

1. [empleados-api.ts](/home/daniel/cuidarte/apps/web/src/features/empleados/api/empleados-api.ts)
2. [empleados-queries.ts](/home/daniel/cuidarte/apps/web/src/features/empleados/model/empleados-queries.ts)
3. [empleados-formatters.ts](/home/daniel/cuidarte/apps/web/src/features/empleados/lib/empleados-formatters.ts)

### Cambios

1. Reemplazar cliente de `assignEmpleadoDirectorSignature(...)`.
2. Crear cliente nuevo, sugerido:
   - `setEmpleadoAsActiveCenterSigner(...)`
3. Ajustar tipado y mensajes de error para el contrato nuevo.

## 4.7 Workstream G - UI del panel del director

### Archivos

1. [empleado-director-signature-panel.tsx](/home/daniel/cuidarte/apps/web/src/features/empleados/components/empleado-director-signature-panel.tsx)
2. [empleados.css](/home/daniel/cuidarte/apps/web/src/features/empleados/empleados.css)
3. [empleado-detail-modal.tsx](/home/daniel/cuidarte/apps/web/src/features/empleados/components/empleado-detail-modal.tsx)

### Cambios

1. Eliminar el campo `Fecha de inicio` del flujo principal.
2. Renombrar la tarjeta de asignacion vigente a algo como:
   - `Firmante activo del centro`
3. Mostrar:
   - director activo actual;
   - firma activa actual;
   - fecha/hora de activacion;
   - estado `Activo` / `No activo`
4. Reemplazar el historial de vigencias por:
   - historial de cambios de firmante, si se expone;
   - o una nota de migracion si el historial legacy sigue aparte temporalmente.
5. Mantener separadas las acciones:
   - `Subir firma`
   - `Activar como firmante del centro`

### Riesgo UX actual

El texto actual del panel y su modelo mental siguen hablando de `vigencias`, `inicio`, `fin` e `historial de vigencias` en [empleado-director-signature-panel.tsx](/home/daniel/cuidarte/apps/web/src/features/empleados/components/empleado-director-signature-panel.tsx). Ese lenguaje debe cambiar completo para no generar doble semantica.

## 4.8 Workstream H - Pruebas

### API

Archivos principales:

1. [empleados-signature.service.test.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/application/empleados-signature.service.test.ts)
2. [empleados.service.test.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/application/empleados.service.test.ts)
3. [empleados.controller.test.ts](/home/daniel/cuidarte/apps/api/src/modules/empleados/presentation/empleados.controller.test.ts)
4. [alimentacion-formato-export.service.test.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.test.ts)
5. [alimentacion.service.test.ts](/home/daniel/cuidarte/apps/api/src/modules/alimentacion/application/alimentacion.service.test.ts)

Casos minimos:

1. centro con un director y firma activa;
2. centro con dos directores y uno activo;
3. cambio de firmante activo invalida reuso del PDF;
4. cambio de firma activa del mismo director invalida reuso del PDF;
5. sin firmante activo, exportacion falla con mensaje funcional claro.

### Web

Archivos principales:

1. [empleados-flow.test.tsx](/home/daniel/cuidarte/apps/web/src/app/__tests__/empleados-flow.test.tsx)
2. nuevos tests del panel de firma si se requieren

Casos minimos:

1. cargar firma;
2. activar firmante sin fecha;
3. ver dos directores y distinguir cual esta activo;
4. ver feedback de activacion correcta.

## 5. Secuencia recomendada de implementacion

### Fase 1 - Contratos y modelo persistente

1. actualizar `packages/contracts/src/empleados.ts`;
2. agregar tabla nueva en `schema.ts`;
3. generar migracion de base de datos.

### Fase 2 - Dominio y repositorio de empleados

1. agregar tipos y comandos nuevos;
2. implementar repositorio Drizzle;
3. dejar disponibles lecturas del firmante activo.

### Fase 3 - Casos de uso y endpoints

1. agregar `setTenantActiveSigner`;
2. exponer endpoint nuevo o reemplazado;
3. adaptar detalle de empleado.

### Fase 4 - Exportador de alimentacion

1. cambiar la resolucion de firma al firmante activo;
2. conservar snapshots;
3. ajustar invalidador de reuso de PDF.

### Fase 5 - UI web

1. cambiar el panel del director;
2. eliminar fecha de vigencia del flujo principal;
3. actualizar textos, toasts y estados.

### Fase 6 - Migracion de datos y QA

1. poblar `tenant_active_signers`;
2. revisar centros ambiguos;
3. ejecutar QA con casos reales de uno y dos directores.

## 6. Riesgos reales del repo actual

1. El detalle de empleado y la UI estan muy acoplados al concepto de `vigencia`.
2. El exportador de alimentacion ya tiene logica de reuso historico delicada; cualquier cambio parcial puede dejar doble fuente de verdad.
3. Los datos legacy pueden tener firmas faltantes en filesystem.
4. La tabla de vigencias actual puede contener casos ambiguos en produccion.

## 7. Decision de minimizacion de riesgo

La implementacion con menor riesgo para este repo es:

1. agregar estructura nueva;
2. migrar de forma controlada;
3. mantener compatibilidad transitoria solo el tiempo necesario;
4. retirar el lenguaje y el flujo de vigencias del panel apenas el firmante activo este operativo.

## 8. Entregables por fase

### Entregable 1

Contrato nuevo de `firmante activo` y tabla persistente lista.

### Entregable 2

API de empleados capaz de activar y consultar firmante activo.

### Entregable 3

Exportador de alimentacion resolviendo firma solo por firmante activo.

### Entregable 4

Panel web del director actualizado sin fecha de vigencia.

### Entregable 5

Migracion de datos ejecutada y QA funcional completado.

## 9. Recomendacion final

Si queremos estabilidad real y menos soporte correctivo, yo implementaria exactamente en este orden:

1. modelo persistente nuevo;
2. servicio de empleados como fuente de verdad;
3. exportador de alimentacion consumiendo esa fuente;
4. panel web sin vigencias;
5. migracion controlada de centros.

Ese camino evita seguir parchando la resolucion temporal y nos deja un flujo mucho mas predecible para los PDFs.
