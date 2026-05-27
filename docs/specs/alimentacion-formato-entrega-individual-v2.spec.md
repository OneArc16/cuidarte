# SPEC: Formato de Entrega de Alimentos Individual (v2)

- Estado: proposed
- Fecha: 2026-05-26
- Modulo: `registro-alimentacion`
- Fase: exportacion de formato individual desde fila principal
- Reemplaza: `docs/specs/alimentacion-formato-entrega-individual-v1.spec.md` como guia activa

## 1. Objetivo de la fase

Habilitar la descarga de un formato individual por adulto mayor y por mes seleccionado, con la estructura visual operativa del formato compartido, para diligenciamiento manual y posterior carga.

## 2. Opinion experta (critica, no complaciente)

1. **No recomiendo generar el PDF en frontend.**
Debe salir desde API para asegurar trazabilidad, seguridad de datos y consistencia de impresion.
2. **No recomiendo quemar la logica en 12 dias fijos.**
El formato visual puede usar bloques de 12 columnas, pero la logica debe cubrir meses de 28/29/30/31 dias.
3. **No recomiendo derivar `Ciudad` desde `tenant.name`.**
Se debe priorizar `tenant.city` + `tenant.department`; el nombre de sede no es fuente geografica confiable.
4. **No recomiendo dejar ambiguo el significado de los chulitos.**
Debe existir una regla unica por estado para evitar diferencias entre centros.
5. **No recomiendo mezclar exportacion e importacion en la misma entrega.**
Primero cerrar exportacion estable; luego importacion sobre el mismo contrato de datos.

## 3. Alcance funcional (v2)

1. En la fila principal del adulto mayor, boton `Exportar` habilitado.
2. Al hacer clic, se descarga PDF individual para el `deliveryMonth` activo.
3. Encabezado del formato:
- `Ciudad`: `TENANT_CITY - TENANT_DEPARTMENT` (ejemplo: `EL BANCO - MAGDALENA`).
- `Fecha`: fecha real de descarga en zona horaria `America/Bogota`.
- `Lugar`: `CENTRO DE VIDA DEL ADULTO MAYOR` (constante de negocio en esta fase).
4. Tabla de productos recibidos por dia:
- Filas: `Refrigerio 1`, `Almuerzo`, `Refrigerio 2`, `Auxilio transporte`.
- Columnas: dias del mes, distribuidos en bloques de 12 para conservar legibilidad.
- Marcas segun estado diario.
5. Filas desplegadas siguen con boton `Editar` solamente.

## 4. Definiciones clave de formato

## 4.1 Estructura de pagina

1. Plantilla HTML + CSS en API y render PDF con Playwright.
2. Cada pagina debe imprimirse igual al formato compartido: **dos formatos (stubs) por pagina**.
3. Regla de dias por stub:
- Bloque A: dias 1-12
- Bloque B: dias 13-24
- Bloque C: dias 25-31 (si aplica, en pagina siguiente)
4. Los stubs duplicados en la misma pagina deben mantener exactamente la misma estructura visual del formato referencia.

## 4.2 Marcas por estado (chulitos)

Regla unica recomendada para evitar ambiguedad:

- `entregado` => `X`
- `no_entregado` => vacio
- `no_aplica` => `N/A`
- sin registro del dia => vacio

Nota: se recomienda `X` y no `✓` para evitar problemas de tipografia en impresoras basicas.

## 4.3 Ciudad, fecha y lugar

1. `Ciudad`:
- prioridad 1: `${tenant.city} - ${tenant.department}` cuando ambos existan
- prioridad 2: `${tenant.city}` cuando no exista departamento
- prioridad 3: `${tenant.department}` cuando no exista ciudad
- prioridad 4: `CIUDAD NO CONFIGURADA`
2. `Fecha`: formateo `dd/mm/yyyy` en `America/Bogota`.
3. `Lugar`: valor por defecto `CENTRO DE VIDA DEL ADULTO MAYOR`.

## 5. Contrato API propuesto

Endpoint:

`GET /api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/pdf?deliveryMonth=YYYY-MM`

Comportamiento:

1. Valida sesion y permisos de acceso al modulo.
2. Valida scope (no exportar adultos mayores fuera del alcance del actor).
3. Consulta registros del adulto mayor en el mes.
4. Genera PDF y responde:
- `Content-Type: application/pdf`
- `Content-Disposition: attachment; filename="formato-entrega-<documento>-<YYYY-MM>.pdf"`

## 6. Cambios tecnicos recomendados

## 6.1 Contracts (`packages/contracts`)

1. Agregar schema de query para exportacion:
- `deliveryMonth` requerido (`YYYY-MM`).

## 6.2 API (`apps/api`)

1. `alimentacion.controller.ts`
- Nuevo endpoint `adultos-mayores/:adultoMayorId/formato-entrega/pdf`.
2. `alimentacion.service.ts`
- Metodo de orquestacion con validacion de permisos, scope y datos.
3. `drizzle-alimentacion.repository.ts`
- Query mensual por adulto mayor incluyendo datos de sede (`city`, `department`, `name`).
4. Nuevo servicio de export:
- `alimentacion-formato-export.service.ts` (responsable solo de construir PDF).
5. Nueva plantilla:
- `alimentacion-formato-pdf-template.ts` (funcion pura de HTML/CSS + mapeo de bloques de dias).

## 6.3 Web (`apps/web`)

1. Activar boton `Exportar` en fila principal.
2. Invocar descarga con `adultoMayorId + deliveryMonth`.
3. Manejar estado `loading` por fila para evitar doble clic.
4. Manejar error con mensaje de usuario cuando no exista `deliveryMonth` o falle backend.

## 7. Reglas de calidad y buenas practicas

1. Separar responsabilidades:
- `Service`: negocio, permisos, scope.
- `ExportService`: render y archivo.
- `Template`: presentacion sin logica de permisos.
2. Evitar strings magicos:
- constantes para nombre de lugar, formato de fecha y prefijo de archivo.
3. Mantener idempotencia de descarga:
- descargar no debe alterar estado de registros.
4. Auditoria obligatoria:
- evento `alimentacion.formato_exported` con `adultoMayorId`, `tenantId`, `deliveryMonth`, `actorUserId`.
5. Preparar importacion futura:
- estructura de grilla de salida debe mapear 1:1 con datos diarios existentes.

## 8. Errores esperados y respuesta

1. `400`: falta `deliveryMonth` o formato invalido.
2. `403`: actor sin permisos o fuera de scope.
3. `404`: adulto mayor no existe en scope.
4. `200` con grilla vacia: cuando no hay registros del mes (no debe ser error).

## 9. Criterios de aceptacion (DoD)

1. Se puede descargar un PDF por fila principal del adulto mayor.
2. El PDF respeta ciudad, fecha y lugar segun reglas definidas.
3. Los estados diarios se reflejan correctamente en cada celda.
4. Funciona para meses de 28, 29, 30 y 31 dias sin truncar informacion.
5. El endpoint respeta permisos y scope multi-tenant.
6. El boton exportar bloquea doble clic mientras descarga.
7. Se registra auditoria por cada exportacion.

## 10. Riesgos y mitigacion

1. Riesgo: sedes sin `city/department`.
Mitigacion: fallback controlado + backlog de saneamiento de datos de sede.
2. Riesgo: formato impreso no coincide con papeleria real.
Mitigacion: prototipo PDF y validacion operativa antes de cierre.
3. Riesgo: meses con muchos dias rompen layout.
Mitigacion: bloques de 12 dias + salto de pagina controlado.
4. Riesgo: acoplar export con import prematuramente.
Mitigacion: cerrar primero contrato y plantilla de exportacion.

## 11. Decisiones cerradas (2026-05-26)

1. La salida se imprime igual al formato compartido: dos formatos duplicados por pagina.
2. El estado `no_aplica` se representa como `N/A`.
3. `Lugar` se mantiene fijo como `CENTRO DE VIDA DEL ADULTO MAYOR` en esta fase.

## 12. Plan de ejecucion recomendado

1. **Paso 1 - Backend base**
- contratos + endpoint + query + auditoria.
2. **Paso 2 - Plantilla PDF**
- html/css del formato y mapeo de bloques de dias.
3. **Paso 3 - Integracion web**
- activar boton y flujo de descarga por fila.
4. **Paso 4 - QA funcional manual**
- validar meses 28/29/30/31 y sedes con datos incompletos.
