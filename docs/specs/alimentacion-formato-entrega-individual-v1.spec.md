# SPEC: Formato de Entrega de Alimentos Individual (v1)

- Estado: draft
- Fecha: 2026-05-26
- Modulo: `registro-alimentacion`
- Alcance de esta fase: exportacion del formato individual desde la fila principal

## 1. Contexto

El listado principal ya esta agrupado por adulto mayor y filtrado por mes (`deliveryMonth`).
En cada fila principal existe el boton de exportar (actualmente deshabilitado).

La necesidad es descargar un formato individual por adulto mayor, tomando como base visual el formato compartido.

## 2. Opinion experta (recomendacion, no validacion ciega)

1. No generaria este formato en frontend.
Debe generarse en API para asegurar consistencia visual, seguridad de datos y trazabilidad.
2. No dejaria columnas fijas de dias hardcodeadas.
Aunque el formato visual tenga 12 columnas por bloque, la logica debe cubrir cualquier mes (28/29/30/31 dias).
3. Definiria una regla de marcado explicita por estado (`entregado`, `no_entregado`, `no_aplica`) para evitar interpretaciones distintas entre centros.
4. La ciudad no debe venir del nombre del centro.
Debe salir de `tenant.city`; si no existe, aplicar fallback controlado.
5. Exportar e importar deben evolucionar como flujos separados.
En esta fase solo se habilita exportar.

## 3. Alcance funcional v1

1. Desde la fila principal (adulto mayor + mes seleccionado), el usuario pulsa exportar.
2. Se descarga un PDF con el formato individual del mes.
3. Encabezado del formato:
- `Ciudad`: ciudad de la sede (`tenant.city`).
- `Fecha`: fecha de descarga (zona horaria America/Bogota).
- `Lugar`: texto fijo `CENTRO DE VIDA DEL ADULTO MAYOR`.
4. Tabla de productos recibidos por dia:
- Filas: `Refrigerio 1`, `Almuerzo`, `Refrigerio 2`, `Auxilio transporte`.
- Columnas: dias del mes seleccionado.
- Marcado segun registro diario de alimentacion.
5. En esta fase no entra importacion de formato diligenciado.

## 4. Reglas de negocio

### 4.1 Seleccion de datos

1. Adulto mayor: `adultoMayorId` de la fila principal.
2. Mes: `deliveryMonth` activo en el filtro (formato `YYYY-MM`).
3. Registros fuente: todos los registros del adulto mayor en ese mes, ordenados por `deliveryDate ASC`.

### 4.2 Reglas de encabezado

1. `Ciudad`:
- Primaria: `tenant.city`.
- Fallback 1: `tenant.name`.
- Fallback 2: `CIUDAD NO CONFIGURADA`.
2. `Fecha`: `new Date()` formateada `es-CO` (descarga real).
3. `Lugar`: constante de negocio `CENTRO DE VIDA DEL ADULTO MAYOR`.

### 4.3 Reglas de marcado (chulitos)

Para cada dia y cada producto:

- `entregado` -> `X`
- `no_entregado` -> vacio
- `no_aplica` -> `N/A`
- sin registro para ese dia -> vacio

## 5. Formato PDF recomendado

## 5.1 Estructura

1. Plantilla HTML + CSS renderizada con Playwright (`chromium`) en API.
2. Disposicion similar al formato compartido.
3. Soportar bloques de 12 dias para mantener legibilidad impresa:
- Bloque 1: dias 1-12
- Bloque 2: dias 13-24
- Bloque 3: dias restantes (25-31 cuando aplique)
4. Repetir encabezado por bloque para lectura operativa.

## 5.2 Decision clave

No limitar funcionalmente el mes a 12 dias.
Se conserva la estetica del formato, pero la logica sigue siendo mensual completa.

## 6. API propuesta (v1)

Ruta nueva:

`GET /api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/pdf?deliveryMonth=YYYY-MM`

Comportamiento:

1. Valida sesion y permisos de acceso al modulo.
2. Valida que el adulto mayor pertenezca al scope del actor.
3. Obtiene registros del mes para ese adulto.
4. Genera PDF y responde con:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="formato-entrega-<documento>-<YYYY-MM>.pdf"`

## 7. Cambios tecnicos sugeridos

## 7.1 contracts (`packages/contracts`)

Agregar schema de query para exportacion:

- `deliveryMonth` requerido (`YYYY-MM`).

## 7.2 API (`apps/api`)

1. `alimentacion.controller.ts`
- Nuevo endpoint `:adultoMayorId/formato-entrega/pdf`.
2. `alimentacion.service.ts`
- Metodo para resolver datos del formato con reglas de scope.
3. `drizzle-alimentacion.repository.ts`
- Query mensual por adulto mayor.
- Incluir `tenant.city` para encabezado.
4. Nuevo servicio:
- `alimentacion-formato-export.service.ts`.
5. Nueva plantilla:
- `alimentacion-formato-pdf-template.ts` (funcion pura `build...Html`).

## 7.3 Web (`apps/web`)

1. Activar boton exportar en fila principal.
2. Disparar descarga con `adultoMayorId` + `deliveryMonth` activo.
3. Bloquear boton durante descarga (`loading`) por fila para evitar doble click.

## 8. Seguridad, permisos y auditoria

1. Exportar debe respetar `canAccessAlimentacion`.
2. Nunca permitir exportar adulto mayor fuera del `scope` del usuario.
3. Registrar evento de auditoria:
- accion sugerida: `alimentacion.formato_exported`
- metadata minima: `adultoMayorId`, `tenantId`, `deliveryMonth`.

## 9. Criterios de aceptacion (DoD)

1. Desde una fila principal se descarga PDF del adulto mayor y mes seleccionado.
2. `Ciudad`, `Fecha`, `Lugar` salen con las reglas del spec.
3. El PDF marca correctamente los productos por dia segun estado.
4. Si no hay registros del mes, el PDF sale con grilla vacia (sin error 500).
5. El endpoint respeta permisos y scope multi-tenant.
6. Nombre de archivo y headers HTTP son correctos para descarga.

## 10. Riesgos y mitigacion

1. Riesgo: formato visual no coincide con papeleria real.
Mitigacion: validar un primer prototipo PDF contra muestra impresa antes de cerrar la fase.
2. Riesgo: falta de `tenant.city` en datos historicos.
Mitigacion: fallback definido + tarea de normalizacion posterior.
3. Riesgo: diferencias por zona horaria al imprimir fecha.
Mitigacion: fijar `America/Bogota` en formateo del servidor.

## 11. Fuera de alcance de esta fase

1. Importacion de formato diligenciado.
2. OCR o lectura automatica de formatos escaneados.
3. Firma digital.
4. Cambios de UI adicionales fuera del boton exportar.
