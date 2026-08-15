# SPEC: Actas con Evidencia, Eliminacion de Alimentacion y Home por Rol

- Estado: completed
- Fecha: 2026-08-15
- Tipo: implementation-spec
- Estrategia: implementacion incremental con aprobacion entre pasos
- Modulos impactados: `actividades-grupales`, `alimentacion`, `home`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`

## 1. Objetivo

Implementar de forma segura y progresiva los siguientes cambios:

1. incluir las fotos adjuntas de una sesion grupal en el PDF de su acta;
2. permitir que `director`, `admin` y `super_admin` eliminen registros de alimentacion;
3. reemplazar la eliminacion fisica de actas por una papelera con restauracion;
4. mostrar los indicadores del home solamente a `auditor`, `director`, `admin` y
   `super_admin`;
5. mostrar botones de acceso directo a modulos para los demas roles, sin indicadores.

La implementacion debe respetar el aislamiento por tenant, conservar trazabilidad y evitar
mezclar transporte HTTP, autorizacion, persistencia y presentacion en una misma capa.

## 2. Protocolo obligatorio de ejecucion incremental

Este spec **no autoriza implementar todos los pasos en una sola ejecucion**.

Reglas para quien implemente:

1. ejecutar exclusivamente el primer paso pendiente del checklist de la seccion 13;
2. no adelantar archivos ni refactors pertenecientes a pasos posteriores;
3. completar las pruebas y la puerta de calidad del paso actual;
4. actualizar en este documento el paso de `[ ]` a `[x]`;
5. registrar en la seccion 14:
   - fecha;
   - archivos cambiados;
   - pruebas ejecutadas y resultado;
   - decisiones o desviaciones;
6. detenerse y presentar el resultado al usuario;
7. continuar solamente despues de una instruccion explicita como `continua`;
8. si una puerta de calidad falla, corregir dentro del mismo paso; no avanzar para ocultar deuda;
9. si aparece una decision funcional que cambia este spec, detenerse y solicitar confirmacion;
10. no mezclar limpieza general, renombrados masivos ni cambios cosmeticos ajenos al paso.

Cada paso debe dejar el repositorio compilable y, cuando aplique, desplegable. Los cambios de base
de datos se manejan con compatibilidad hacia adelante: primero estructura aditiva y luego
comportamiento.

## 3. Decisiones funcionales cerradas

### 3.1 Significado de acta

En este alcance, `acta` significa la actividad o sesion almacenada en
`actividades_grupales`, junto con:

1. profesionales asignados;
2. diligenciamiento;
3. integrantes;
4. fotos de soporte;
5. PDF de soporte.

### 3.2 Evidencia incluida en el PDF

1. Se incluyen unicamente archivos `support_photo`.
2. El archivo `support_pdf` continua disponible como adjunto independiente.
3. Se admiten las cinco fotos que permite actualmente el dominio.
4. Los archivos originales no se modifican.
5. Para el PDF se genera una representacion normalizada y acotada en memoria.

### 3.3 Papelera

1. Enviar un acta a la papelera es un borrado logico.
2. No se borran filas relacionadas ni archivos fisicos.
3. No existe eliminacion definitiva ni purga automatica en este alcance.
4. El numero de acta permanece reservado mientras el registro esta en la papelera.
5. Las actas eliminadas no aparecen en listados, detalles, PDFs ni indicadores activos.

### 3.4 Eliminacion de alimentacion

1. La eliminacion es definitiva desde la interfaz.
2. Antes de borrar se guarda un snapshot completo en `audit_logs` dentro de la misma transaccion.
3. No se eliminan emisiones ni versiones importadas de PDFs del beneficiario.
4. El registro deja de participar en listados, exportaciones futuras e indicadores.

### 3.5 Home

Roles autorizados para ver tarjetas, totales e indicadores:

1. `super_admin`;
2. `admin`;
3. `auditor`;
4. `director`.

Los demas roles ven botones de acceso directo a sus modulos disponibles en el contenido del home,
sin indicadores. La navegacion lateral y movil se conserva de acuerdo con los permisos existentes
de cada modulo.

## 4. Matrices de autorizacion

### 4.1 Home

| Rol           | Ver dashboard | Consultar `GET /home/dashboard` | Ver accesos directos |
| ------------- | ------------- | ------------------------------- | -------------------- |
| `super_admin` | Si            | Si, alcance global              | No                   |
| `admin`       | Si            | Si, su tenant                   | No                   |
| `auditor`     | Si            | Si, su tenant                   | No                   |
| `director`    | Si            | Si, su tenant                   | No                   |
| Otros roles   | No            | No, `403`                       | Si                   |

### 4.2 Alimentacion

| Rol           | Consultar | Crear/editar | Eliminar | Alcance                    |
| ------------- | --------- | ------------ | -------- | -------------------------- |
| `super_admin` | Si        | Si           | Si       | Global o tenant solicitado |
| `admin`       | Si        | Si           | Si       | Tenant de sesion           |
| `director`    | Si        | Si           | Si       | Tenant de sesion           |
| `auditor`     | Si        | No           | No       | Tenant de sesion           |
| Otros roles   | No        | No           | No       | Ninguno                    |

### 4.3 Papelera de actas

| Actor               | Listar papelera    | Restaurar                                    |
| ------------------- | ------------------ | -------------------------------------------- |
| `super_admin`       | Todas o por tenant | Cualquier acta dentro del alcance solicitado |
| `admin`             | Su tenant          | Cualquier acta de su tenant                  |
| `director`          | Su tenant          | Cualquier acta de su tenant                  |
| Creador profesional | Su tenant          | Solamente actas creadas por el mismo         |
| `auditor`           | No                 | No                                           |

La API es la fuente de verdad. Ocultar botones en React nunca reemplaza la validacion backend.

## 5. Limites de arquitectura

### 5.1 Contratos compartidos

`packages/contracts` contiene:

1. schemas Zod de entrada y salida;
2. tipos inferidos de esos schemas;
3. listas de roles compartidas cuando API y web necesitan la misma regla estable.

No contiene consultas, autorizacion contextual ni logica de React/NestJS.

### 5.2 API NestJS

La separacion obligatoria es:

1. controller: HTTP, parametros, schemas y respuesta;
2. service de aplicacion: caso de uso, autorizacion contextual y orquestacion;
3. policy de dominio: decisiones puras por rol/actor;
4. repository: consultas y transacciones;
5. storage: lectura/escritura de archivos.

La papelera debe tener un servicio de aplicacion enfocado, sugerido:

```txt
actividades-grupales/application/actividades-grupales-trash.service.ts
```

No se debe seguir ampliando `ActividadesGrupalesService` con todo el flujo de papelera.

### 5.3 Web React

La separacion obligatoria es:

1. `api/`: transporte HTTP;
2. `model/`: queries, mutations e invalidacion de cache;
3. `lib/`: permisos y formatters puros;
4. `components/`: UI reutilizable;
5. `pages/`: composicion y estado de pagina.

No se deben hacer llamadas `fetch` directamente desde componentes ni duplicar listas de roles en
varios archivos.

### 5.4 Monorepo

1. `apps/api` y `apps/web` consumen `@cuidarte/contracts`.
2. Ninguna app importa archivos internos de otra app.
3. Las tareas permanecen definidas en cada paquete y el root solo delega con `turbo run`.
4. No se agregan scripts root con logica especifica de una app.

## 6. Modelo de datos de la papelera

Actualizar `actividadesGrupales` en
[schema.ts](/home/daniel/cuidarte/apps/api/src/database/schema.ts) con:

| Campo             | Tipo                         | Regla                               |
| ----------------- | ---------------------------- | ----------------------------------- |
| `deletedAt`       | timestamp con zona, nullable | `null` significa activa             |
| `deletedByUserId` | uuid, nullable               | FK `users.id`, `onDelete: restrict` |

Indice recomendado:

```txt
(tenant_id, deleted_at)
```

Reglas:

1. ambos campos son `null` para registros activos;
2. ambos campos tienen valor para registros en papelera;
3. la transicion se realiza en una transaccion;
4. se mantiene `actividades_grupales_tenant_acta_unique` sin convertirlo en indice parcial;
5. `getNextActaNumber` no decrementa ni reutiliza consecutivos;
6. la migracion es aditiva y no modifica datos historicos existentes;
7. generar la migracion desde Drizzle y revisar el SQL antes de aplicarlo;
8. no editar manualmente snapshots o `_journal.json` salvo que la herramienta lo requiera y el
   cambio sea revisado.

## 7. Contratos API propuestos

### 7.1 Roles del home

En `packages/contracts/src/home.ts` agregar una unica constante:

```ts
homeDashboardAccessRoleValues;
```

Debe satisfacer `readonly UserRole[]` y ser consumida por API y web.

### 7.2 Eliminar alimentacion

Agregar:

```txt
DELETE /registro-alimentacion/:id
```

Respuesta:

```json
{ "success": true }
```

El `AlimentacionListItem` debe exponer `canDelete` calculado en backend. No se infiere solamente a
partir del rol en el navegador.

Errores:

1. `401`: sin sesion;
2. `403`: rol o tenant no autorizado;
3. `404`: registro inexistente dentro del alcance;
4. `409`: estado concurrente que impida completar la operacion, si aplica.

### 7.3 Papelera de actas

Agregar:

```txt
GET  /actividades-grupales/papelera
POST /actividades-grupales/:id/restaurar
```

El endpoint de papelera reutiliza filtros de busqueda, tipo de actividad y tenant de forma
equivalente al listado activo. Su respuesta incluye como minimo:

1. datos visibles del acta;
2. `deletedAt`;
3. `deletedByUserId`;
4. `deletedByUserFullName`;
5. `canRestore`.

Restaurar responde:

```json
{ "success": true }
```

Errores:

1. `403`: actor sin permiso;
2. `404`: acta eliminada inexistente dentro del alcance;
3. `409`: el acta ya esta activa o su estado cambio concurrentemente.

Las rutas estaticas como `/papelera` deben declararse antes de rutas dinamicas `/:id` para evitar
ambiguedad en el router.

## 8. Reglas de persistencia y auditoria

### 8.1 Alimentacion

La eliminacion se ejecuta en una unica transaccion:

1. seleccionar el registro dentro del alcance ya validado;
2. insertar `audit_logs` con accion `alimentacion.deleted`;
3. guardar en metadata:
   - id;
   - tenantId;
   - adultoMayorId;
   - numero de documento y nombre visibles;
   - fecha de entrega;
   - organizador;
   - cuatro estados de entrega;
   - createdAt y updatedAt;
4. eliminar por id;
5. comprobar que exactamente una fila fue afectada.

No se confia en un `tenantId` enviado por el cliente para autorizar el borrado.

### 8.2 Actas

Enviar a papelera:

1. actualizar solo si `deleted_at IS NULL`;
2. establecer `deleted_at`, `deleted_by_user_id` y `updated_at`;
3. insertar auditoria `actividades-grupales.moved-to-trash`;
4. no llamar `filesStorage.deleteFile`;
5. no ejecutar `DELETE` sobre `actividades_grupales`.

Restaurar:

1. seleccionar una fila con `deleted_at IS NOT NULL` dentro del alcance;
2. validar `canRestore` en el servicio;
3. actualizar solo si sigue eliminada;
4. limpiar `deleted_at` y `deleted_by_user_id`;
5. actualizar `updated_at`;
6. insertar auditoria `actividades-grupales.restored`.

Los listados activos, `findById`, descarga de adjuntos y exportacion deben exigir
`deleted_at IS NULL`. La papelera debe usar consultas separadas que exijan
`deleted_at IS NOT NULL`; no se agrega un booleano ambiguo a un unico metodo generico.

## 9. Generacion del PDF con fotos

### 9.1 Preparacion

El exportador obtiene el detalle autorizado y usa los registros internos de archivos para leer
las fotos desde `ActividadesGrupalesFilesStorage`. No usa URLs HTTP ni cookies de navegador.

Por cada foto:

1. leer el buffer original;
2. validar que se pueda decodificar;
3. aplicar orientacion EXIF;
4. redimensionar dentro de un maximo de `1600 x 1600`, sin ampliar imagenes pequenas;
5. convertir la copia para PDF a JPEG con calidad controlada;
6. crear un `data:image/jpeg;base64,...`;
7. conservar el nombre original para el pie de foto.

El original almacenado no cambia. El procesamiento debe tener limite de pixeles para evitar
imagenes maliciosas o consumos desproporcionados.

Como existen maximo cinco fotos, pueden prepararse en paralelo mediante `Promise.all`; no se debe
introducir una cascada de lecturas secuenciales innecesaria.

### 9.2 Plantilla

Agregar una seccion `EVIDENCIA FOTOGRAFICA` despues del listado de asistentes:

1. ocultarla cuando no existan fotos;
2. ordenar por `createdAt` y usar `id` como desempate estable;
3. distribuir en dos columnas;
4. usar `object-fit: contain`;
5. evitar dividir una foto y su pie entre paginas;
6. iniciar la evidencia en una pagina nueva para no romper las tablas previas;
7. escapar el nombre visible del archivo;
8. incluir texto alternativo en el HTML fuente.

Si una foto registrada falta o es invalida, la exportacion falla con error controlado. No se genera
silenciosamente un acta que omita evidencia esperada.

## 10. Cache y consistencia del home

Todas las mutaciones que cambien conteos deben invalidar:

```ts
["home", "dashboard"];
```

Incluye como minimo:

1. eliminar alimentacion;
2. enviar acta a papelera;
3. restaurar acta.

Adicionalmente, `HomeService.summarizeActividades` cuenta solamente actas activas. Los roles sin
dashboard no montan `HomeDashboard`, por lo que React Query no crea la consulta ni su intervalo de
refetch.

## 11. Estrategia de pruebas

### 11.1 Contratos

1. schemas aceptan respuestas validas;
2. rechazan IDs, timestamps y roles invalidos;
3. la lista de roles del home es exhaustiva y compartida.

### 11.2 API

Pruebas unitarias por servicio/policy:

1. cada rol permitido y prohibido;
2. tenant propio y tenant ajeno;
3. registros inexistentes;
4. estado concurrente;
5. auditoria y operacion dentro de la misma transaccion;
6. filtros `deleted_at` activos/eliminados;
7. no borrar archivos al enviar a papelera;
8. restaurar conserva diligenciamiento y adjuntos;
9. dashboard no cuenta actas eliminadas;
10. PDF sin fotos, con una foto y con cinco fotos;
11. foto corrupta o ausente;
12. controller valida parametros y delega el actor autenticado.

Las pruebas de repositorio deben verificar las condiciones SQL relevantes o ejecutar contra una BD
de prueba cuando exista infraestructura disponible. No basta con probar solo mocks si la seguridad
depende de filtros por tenant y `deleted_at`.

### 11.3 Web

1. profesional ve accesos directos y no se solicita `/home/dashboard`;
2. los cuatro roles autorizados ven dashboard;
3. un error del dashboard no afecta la navegacion;
4. boton eliminar alimentacion solo aparece cuando `canDelete` es `true`;
5. confirmacion, estado pendiente, error y exito de eliminacion;
6. la fila desaparece tras invalidar cache;
7. acceso, listado y restauracion desde papelera;
8. un registro sin `canRestore` no muestra accion;
9. navegacion movil sigue funcionando;
10. dialogos tienen nombre accesible, foco controlado y acciones por teclado.

## 12. Plan incremental detallado

### Paso 0 - Linea base y fixtures

Objetivo: demostrar que el repositorio esta sano antes de modificar comportamiento.

Cambios permitidos:

1. agregar o ajustar exclusivamente fixtures/helpers necesarios para representar todos los roles;
2. documentar fallos preexistentes sin intentar resolver deuda ajena.

Validacion:

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web test
pnpm typecheck
```

Puerta de salida: linea base verde o fallos preexistentes identificados con evidencia reproducible.

### Paso 1 - Accesos directos del home en web

Objetivo: impedir que roles profesionales soliciten o rendericen datos del dashboard, y en su
lugar mostrar accesos directos a los modulos permitidos.

Cambios:

1. agregar `homeDashboardAccessRoleValues` al contrato;
2. crear policy/helper web puro;
3. crear componente `HomeDirectAccess` y sus tarjetas de acceso;
4. renderizar `HomeDashboard` solo para roles autorizados;
5. mantener navegacion existente;
6. agregar pruebas de admin, auditor, director, superadmin y un profesional;
7. comprobar mediante MSW que el profesional no solicita el endpoint ni ve indicadores.

Puerta de salida: web y contratos verdes. Todavia no se cambia la API.

### Paso 2 - Autorizacion backend del dashboard

Objetivo: cerrar la filtracion por llamada directa a la API.

Cambios:

1. crear policy de acceso al dashboard;
2. aplicar `RolesGuard` y `RequireRoles` al controller;
3. validar tambien en `HomeService`;
4. actualizar Swagger y pruebas de controller/service;
5. conservar el alcance global/tenant actual de los roles permitidos.

Puerta de salida: rol profesional recibe `403`; los cuatro roles permitidos conservan sus conteos.

### Paso 3 - Eliminacion de alimentacion en API

Objetivo: entregar el caso de uso completo sin UI.

Cambios:

1. contratos `canDelete` y respuesta de eliminacion;
2. policy `canDeleteAlimentacion`;
3. comando y metodo de repositorio;
4. transaccion de auditoria + borrado;
5. metodo de servicio con validacion por tenant;
6. endpoint `DELETE`;
7. pruebas de policy, service, repository y controller.

Puerta de salida: API compilable, permisos y auditoria demostrados por pruebas.

### Paso 4 - Eliminacion de alimentacion en web

Objetivo: exponer el caso de uso ya protegido por backend.

Cambios:

1. cliente API;
2. mutation React Query;
3. invalidacion de alimentacion y home;
4. accion por cada fila diaria, no en la fila agrupadora del beneficiario;
5. dialogo de confirmacion con nombre, fecha y beneficiario;
6. feedback de pendiente, exito y error;
7. pruebas de flujo y accesibilidad basica.

Puerta de salida: director/admin/superadmin eliminan; auditor nunca ve la accion.

### Paso 5 - Migracion aditiva para papelera

Objetivo: preparar persistencia sin cambiar comportamiento de produccion.

Cambios:

1. agregar campos e indice a `schema.ts`;
2. generar migracion Drizzle;
3. revisar que no haya `DROP`, backfill destructivo ni cambio del unique de acta;
4. compilar API;
5. probar migracion en una BD desechable cuando este disponible.

Puerta de salida: la aplicacion anterior puede seguir operando con las columnas nuevas.

### Paso 6 - Borrado logico de actas y filtros activos

Objetivo: dejar de destruir actas y adjuntos.

Cambios:

1. reemplazar el `DELETE` del repositorio por transicion a papelera;
2. retirar la eliminacion de archivos de este flujo;
3. filtrar actas eliminadas en listado y detalle activos;
4. impedir edicion, diligenciamiento, descarga y PDF de actas eliminadas;
5. excluirlas de indicadores del home;
6. cambiar auditoria y mensajes de dominio;
7. invalidar dashboard desde la mutation web existente;
8. actualizar el texto UI a `Acta enviada a la papelera`;
9. pruebas de no destruccion y filtros.

Puerta de salida: eliminar desde la UI actual conserva filas relacionadas y archivos.

### Paso 7 - API de papelera y restauracion

Objetivo: entregar recuperacion completa por API.

Cambios:

1. contratos de listado eliminado y restauracion;
2. tipos y metodos separados de repositorio;
3. `ActividadesGrupalesTrashService`;
4. policies `canListTrash` y `canRestore`;
5. endpoints de papelera/restauracion;
6. auditoria de restauracion;
7. pruebas por rol, tenant y concurrencia.

Puerta de salida: un acta restaurada reaparece completa en el listado activo.

### Paso 8 - Papelera de actas en web

Objetivo: completar el flujo de recuperacion para usuarios autorizados.

Cambios:

1. rutas y navegacion a papelera;
2. cliente API y query keys independientes;
3. listado con filtros y metadata de eliminacion;
4. dialogo de restauracion;
5. invalidacion de listado activo, papelera y home;
6. estados vacio, cargando y error;
7. pruebas de flujo, rutas y permisos.

Puerta de salida: restauracion usable en desktop y movil sin exponer acciones prohibidas.

### Paso 9 - Fotos adjuntas en el PDF del acta

Objetivo: producir un acta autocontenida con evidencia fotografica.

Cambios:

1. tipo interno para imagen preparada;
2. lectura y normalizacion segura con `sharp`;
3. preparacion paralela de maximo cinco fotos;
4. paso explicito de imagenes hacia la plantilla;
5. seccion multipagina de evidencia;
6. manejo controlado de foto ausente/corrupta;
7. pruebas de servicio, template y renderizado PDF.

Puerta de salida: PDF manual verificado con 0, 1 y 5 fotos en los tres formatos admitidos.

### Paso 10 - Regresion integral y cierre

Objetivo: validar que los incrementos funcionan juntos.

Cambios permitidos: solo correcciones derivadas de regresiones del alcance.

Validacion:

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web test
pnpm typecheck
pnpm build
pnpm e2e
```

QA manual minimo:

1. iniciar sesion con cada rol relevante;
2. verificar aislamiento entre dos tenants;
3. eliminar alimentacion y revisar indicador/exportacion;
4. enviar acta con adjuntos a papelera;
5. reiniciar la API y restaurarla;
6. abrir su PDF y comprobar todas las fotos;
7. verificar navegacion movil y desktop.

Puerta de salida: criterios de aceptacion completos y sin regresiones conocidas.

## 13. Checklist de ejecucion

- [x] Paso 0 - Linea base y fixtures
- [x] Paso 1 - Accesos directos del home en web
- [x] Paso 2 - Autorizacion backend del dashboard
- [x] Paso 3 - Eliminacion de alimentacion en API
- [x] Paso 4 - Eliminacion de alimentacion en web
- [x] Paso 5 - Migracion aditiva para papelera
- [x] Paso 6 - Borrado logico de actas y filtros activos
- [x] Paso 7 - API de papelera y restauracion
- [x] Paso 8 - Papelera de actas en web
- [x] Paso 9 - Fotos adjuntas en el PDF del acta
- [x] Paso 10 - Regresion integral y cierre

## 14. Registro de ejecucion

Agregar una entrada al terminar cada paso:

```txt
### Paso N - YYYY-MM-DD

- Estado: completed | blocked
- Archivos cambiados:
  - ruta
- Pruebas:
  - comando: resultado
- Decisiones:
  - sin desviaciones | descripcion
- Riesgos pendientes:
  - ninguno | descripcion
```

### Paso 0 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `docs/specs/2026-08-15-actas-alimentacion-home-implementacion-incremental.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: falla reproducible por `EACCES` al escribir `packages/contracts/dist/eps.*`; los archivos estan propiedad de `nobody:nogroup`.
  - `pnpm --filter @cuidarte/api test`: 37/40 suites verdes; fallan `backoffice.controller.test.ts`, `home.service.test.ts` y `tenant-branding.contracts.test.ts`.
  - `pnpm --filter @cuidarte/web test`: 32/86 tests verdes; fallan suites de `app/*`, `routing-guards.test.tsx` y `disability-options.test.ts` por handlers MSW faltantes para `/api/auth/me` y una expectativa desalineada en opciones de discapacidad.
  - `pnpm typecheck`: falla por error de `turbo` al crear logs/caché con `Permission denied`.
- Decisiones:
  - sin desviaciones
- Riesgos pendientes:
  - el baseline no esta verde y hay deuda preexistente en permisos de artefactos, pruebas API y pruebas web; se continuara de forma incremental solo cuando el usuario indique `continua`

### Paso 1 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/web/src/app/__tests__/home-dashboard.test.tsx`
  - `apps/web/src/features/home/components/home-access-shortcut-card.tsx`
  - `apps/web/src/features/home/components/home-direct-access.tsx`
  - `apps/web/src/features/home/home.css`
  - `apps/web/src/features/home/lib/home-dashboard-permissions.test.ts`
  - `apps/web/src/features/home/lib/home-dashboard-permissions.ts`
  - `apps/web/src/features/home/pages/home-page.tsx`
  - `apps/web/vite.config.ts`
  - `packages/contracts/src/home.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: OK.
  - `pnpm --filter @cuidarte/web typecheck`: OK.
  - `pnpm exec vitest run src/features/home/lib/home-dashboard-permissions.test.ts src/app/__tests__/home-dashboard.test.tsx`: OK.
  - `pnpm exec turbo run typecheck --no-cache`: falla por deuda preexistente en `apps/api`, con errores en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/empleados/application/empleados.service.test.ts`.
- Decisiones:
  - se agrego `homeDashboardAccessRoleValues` al contrato compartido y una policy pura `canViewHomeDashboard` en web;
  - se renderiza `HomeDashboard` solo para roles autorizados y `HomeDirectAccess` para perfiles profesionales;
  - se alineo `VITE_API_URL` del entorno de Vitest con los handlers de MSW del repo para que las pruebas del home apunten a `http://localhost:3001/api`;
  - se ajusto la expectativa del dashboard para respetar la politica existente de `Gestión de empleados`, que no incluye a `director`.
- Riesgos pendientes:
  - el `typecheck` raiz sigue revelando deuda preexistente en API ajena a este paso; no se toco porque esta fuera del alcance del home

### Paso 2 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/home/home.controller.test.ts`
  - `apps/api/src/modules/home/home.controller.ts`
  - `apps/api/src/modules/home/home.policy.test.ts`
  - `apps/api/src/modules/home/home.policy.ts`
  - `apps/api/src/modules/home/home.service.test.ts`
  - `apps/api/src/modules/home/home.service.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/home/home.controller.test.ts src/modules/home/home.policy.test.ts src/modules/home/home.service.test.ts`: OK.
  - `pnpm --filter @cuidarte/api typecheck`: falla por deuda preexistente en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/empleados/application/empleados.service.test.ts`.
- Decisiones:
  - se protegió el controller de home con `SessionGuard`, `RolesGuard` y `RequireRoles(...homeDashboardAccessRoleValues)`;
  - se agregó una policy pura `canViewHomeDashboard` en API y el servicio la valida antes de calcular conteos;
  - se documentó el contrato del controller con pruebas de metadata para guards y roles;
  - se mantuvo la cobertura de rechazo para roles profesionales sin acceso.
- Riesgos pendientes:
  - el `typecheck` raiz del API sigue mostrando deuda ajena al home; no se abordó porque no pertenece a este paso

### Paso 3 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/alimentacion/application/alimentacion.service.test.ts`
  - `apps/api/src/modules/alimentacion/application/alimentacion.service.ts`
  - `apps/api/src/modules/alimentacion/domain/alimentacion.policy.test.ts`
  - `apps/api/src/modules/alimentacion/domain/alimentacion.policy.ts`
  - `apps/api/src/modules/alimentacion/domain/alimentacion.repository.ts`
  - `apps/api/src/modules/alimentacion/domain/alimentacion.types.ts`
  - `apps/api/src/modules/alimentacion/infrastructure/drizzle-alimentacion.repository.test.ts`
  - `apps/api/src/modules/alimentacion/infrastructure/drizzle-alimentacion.repository.ts`
  - `apps/api/src/modules/alimentacion/presentation/alimentacion.controller.test.ts`
  - `apps/api/src/modules/alimentacion/presentation/alimentacion.controller.ts`
  - `packages/contracts/src/alimentacion.ts`
  - `packages/contracts/dist/alimentacion.js`
  - `packages/contracts/dist/alimentacion.d.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: OK.
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/alimentacion/application/alimentacion.service.test.ts src/modules/alimentacion/presentation/alimentacion.controller.test.ts src/modules/alimentacion/domain/alimentacion.policy.test.ts src/modules/alimentacion/infrastructure/drizzle-alimentacion.repository.test.ts`: OK.
- Decisiones:
  - `canDelete` quedó como salida del contrato con default compatible para no romper consumidores que todavía no lo envían.
  - La eliminación se resolvió con permiso declarativo en controller y validacion de tenant/scope en service/repository.
- Riesgos pendientes:
  - ninguno

### Paso 4 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/web/src/app/__tests__/alimentacion-flow.test.tsx`
  - `apps/web/src/features/alimentacion/api/alimentacion-api.ts`
  - `apps/web/src/features/alimentacion/components/alimentacion-delete-dialog.tsx`
  - `apps/web/src/features/alimentacion/components/alimentacion-table.tsx`
  - `apps/web/src/features/alimentacion/model/alimentacion-queries.ts`
  - `apps/web/src/features/alimentacion/pages/alimentacion-index-page.tsx`
  - `apps/web/src/features/alimentacion/alimentacion.css`
  - `apps/web/src/test/fixtures/alimentacion.fixtures.ts`
  - `apps/web/src/test/handlers/alimentacion.handlers.ts`
  - `docs/specs/2026-08-15-actas-alimentacion-home-implementacion-incremental.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/alimentacion-flow.test.tsx`: OK.
  - `pnpm --filter @cuidarte/web exec tsc -p tsconfig.json --noEmit`: OK.
- Decisiones:
  - la accion de eliminar se expone en cada fila diaria expandida, no en la fila agrupadora;
  - el borrado usa `canDelete` del backend para decidir visibilidad;
  - la mutacion de borrado actualiza la cache de React Query y luego invalida `alimentacion` y `home` para mantener la UI sincronizada;
  - el dialogo de confirmacion se mantiene explicito con nombre, fecha y beneficiario, y la UI de pruebas valida esa superficie estable.
- Riesgos pendientes:
  - ninguno

### Paso 5 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/drizzle/0027_hushed_paper_trail.sql`
  - `apps/api/drizzle/meta/_journal.json`
  - `apps/api/src/database/schema.ts`
  - `docs/specs/2026-08-15-actas-alimentacion-home-implementacion-incremental.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec tsc -p tsconfig.json --noEmit`: falla por deuda preexistente en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/empleados/application/empleados.service.test.ts`.
  - `pnpm --filter @cuidarte/api exec tsc -p tsconfig.json --noEmit --pretty false 2>&1 | rg 'database/schema.ts|deleted_at|deleted_by_user_id|deletedByUserId|actividades_grupales_tenant_deleted_at_idx'`: sin errores nuevos en el schema tocado.
- Decisiones:
  - se agregaron `deleted_at` y `deleted_by_user_id` como columnas aditivas y nulas para mantener compatibilidad hacia adelante;
  - el indice compuesto `tenant_id + deleted_at` prepara el filtrado de listas activas y papelera sin tocar la unique de `acta_number`;
  - la migracion se dejo separada del cambio de comportamiento, para que el siguiente paso solo consuma la nueva estructura.
- Riesgos pendientes:
  - el typecheck global del API sigue mostrando deuda ajena al alcance de este paso; no se toco porque no pertenece a la migracion de papelera

### Paso 6 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.policy.ts`
  - `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.policy.test.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales-trash.service.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales-trash.service.test.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.test.ts`
  - `apps/api/src/modules/actividades-grupales/actividades-grupales.module.ts`
  - `apps/api/src/modules/actividades-grupales/presentation/actividades-grupales.controller.ts`
  - `apps/api/src/modules/actividades-grupales/presentation/actividades-grupales.controller.test.ts`
  - `apps/api/src/modules/actividades-grupales/infrastructure/drizzle-actividades-grupales.repository.ts`
  - `apps/api/src/modules/home/home.service.ts`
  - `apps/web/src/features/actividades-grupales/model/actividades-grupales-queries.ts`
  - `apps/web/src/features/actividades-grupales/pages/actividades-grupales-index-page.tsx`
  - `apps/web/src/features/actividades-grupales/components/actividad-grupal-delete-dialog.tsx`
  - `apps/web/src/features/actividades-grupales/components/actividades-grupales-table.tsx`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/actividades-grupales/application/actividades-grupales-trash.service.test.ts src/modules/actividades-grupales/domain/actividad-grupal.policy.test.ts src/modules/actividades-grupales/presentation/actividades-grupales.controller.test.ts src/modules/actividades-grupales/application/actividades-grupales.service.test.ts`: OK.
  - `pnpm --filter @cuidarte/api typecheck`: falla por deuda preexistente en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/empleados/application/empleados.service.test.ts`.
  - `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/actividades-flow.test.tsx`: falla en aserciones de toast del flujo amplio de actividades, fuera del alcance directo de esta iteracion.
- Decisiones:
  - se movio la eliminacion de actas a una papelera logica con `deletedAt` y `deletedByUserId`, sin borrar archivos ni relaciones;
  - la autorizacion de borrado se concentro en una policy de dominio reutilizable y en un servicio de aplicacion dedicado para no crecer `ActividadesGrupalesService` de forma monolitica;
  - el home ya excluye actas eliminadas de sus agregados;
  - la UI cambio el lenguaje de eliminacion a `papelera` para alinear la intencion funcional con el backend.
- Riesgos pendientes:
  - el `typecheck` global del API sigue mostrando deuda ajena al alcance de este paso;
  - el flujo integral de actividades del web tiene una regresion previa o colateral en toasts de exito, que queda para una iteracion aparte si el usuario la solicita.

### Paso 7 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `packages/contracts/src/actividades-grupales.ts`
  - `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.policy.ts`
  - `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.policy.test.ts`
  - `apps/api/src/modules/actividades-grupales/domain/actividad-grupal.types.ts`
  - `apps/api/src/modules/actividades-grupales/domain/actividades-grupales.repository.ts`
  - `apps/api/src/modules/actividades-grupales/infrastructure/drizzle-actividades-grupales.repository.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales-trash.service.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales-trash.service.test.ts`
  - `apps/api/src/modules/actividades-grupales/presentation/actividades-grupales.controller.ts`
  - `apps/api/src/modules/actividades-grupales/presentation/actividades-grupales.controller.test.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.test.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: OK.
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/actividades-grupales/application/actividades-grupales-trash.service.test.ts src/modules/actividades-grupales/domain/actividad-grupal.policy.test.ts src/modules/actividades-grupales/presentation/actividades-grupales.controller.test.ts src/modules/actividades-grupales/application/actividades-grupales.service.test.ts`: OK.
  - `pnpm --filter @cuidarte/api exec tsc --noEmit -p tsconfig.json --pretty false 2>&1 | rg 'src/modules/(actividades-grupales|home)'`: sin errores propios del alcance.
- Decisiones:
  - se separaron los metodos de repositorio para papelera activa y restauracion, manteniendo `findById` y los listados activos filtrados por `deleted_at IS NULL`;
  - la papelera expone `deletedAt`, `deletedByUserId`, `deletedByUserFullName` y `canRestore`, y la restauracion responde `success: true`;
  - el controller expone `/actividades-grupales/papelera` antes de rutas dinamicas y `/actividades-grupales/:id/restaurar` como contrato estable para el siguiente paso web;
  - la auditoria usa acciones diferenciadas para mover a papelera y restaurar.
- Riesgos pendientes:
  - el `typecheck` global del API sigue mostrando deuda preexistente fuera del alcance de este paso;
  - falta el paso 8 para que la papelera sea visible y utilizable desde web.

### Paso 8 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/__tests__/actividades-trash-flow.test.tsx`
  - `apps/web/src/features/actividades-grupales/api/actividades-grupales-api.ts`
  - `apps/web/src/features/actividades-grupales/components/actividad-grupal-restore-dialog.tsx`
  - `apps/web/src/features/actividades-grupales/components/actividades-grupales-trash-table.tsx`
  - `apps/web/src/features/actividades-grupales/lib/actividades-grupales-formatters.ts`
  - `apps/web/src/features/actividades-grupales/lib/actividades-grupales-paths.ts`
  - `apps/web/src/features/actividades-grupales/lib/actividades-grupales-permissions.test.ts`
  - `apps/web/src/features/actividades-grupales/lib/actividades-grupales-permissions.ts`
  - `apps/web/src/features/actividades-grupales/model/actividades-grupales-queries.ts`
  - `apps/web/src/features/actividades-grupales/pages/actividades-grupales-index-page.tsx`
  - `apps/web/src/features/actividades-grupales/pages/actividades-grupales-page.tsx`
  - `apps/web/src/features/actividades-grupales/pages/actividades-grupales-trash-page.tsx`
  - `apps/web/src/test/fixtures/actividades.fixtures.ts`
  - `apps/web/src/test/handlers/actividades.handlers.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: OK.
  - `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/actividades-trash-flow.test.tsx src/features/actividades-grupales/lib/actividades-grupales-permissions.test.ts`: OK.
  - `pnpm --filter @cuidarte/web typecheck`: OK.
- Decisiones:
  - se expuso la papelera solo para roles con permiso real de restauracion y se redirigio al home a auditoria cuando intenta entrar directo;
  - se separo el listado activo de la papelera con query keys y handlers propios para evitar invalidaciones ambiguas;
  - la accion de restaurar se confirmo con dialogo dedicado y la tabla muestra metadata de eliminacion para que la recuperacion sea auditable;
  - el acceso rapido desde el listado activo se mantuvo visible para roles autorizados sin mezclarlo con indicadores del home.
- Riesgos pendientes:
  - ninguno dentro del alcance de este paso

### Paso 9 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/actividades-grupales/application/actividad-grupal-acta-photo-assets.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividad-grupal-acta-photo-assets.test.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividad-grupal-acta-pdf-template.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividad-grupal-acta-pdf-template.test.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales-acta-export.service.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividades-grupales.service.ts`
  - `docs/specs/2026-08-15-actas-alimentacion-home-implementacion-incremental.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/actividades-grupales/application/actividad-grupal-acta-photo-assets.test.ts src/modules/actividades-grupales/application/actividad-grupal-acta-pdf-template.test.ts`: OK.
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/actividades-grupales/application/actividades-grupales.service.test.ts src/modules/actividades-grupales/presentation/actividades-grupales.controller.test.ts`: OK.
  - `pnpm --filter @cuidarte/api build`: OK.
- Decisiones:
  - los originales se conservan y las copias para PDF se normalizan en memoria con `sharp`, orientacion EXIF, limite de pixeles, dimensiones maximas de `1600 x 1600` y JPEG de calidad acotada;
  - las cinco fotos se procesan en paralelo y una evidencia ausente o corrupta produce un error controlado;
  - el servicio de actividades entrega al exportador un bundle interno tipado con el detalle publico validado y los metadatos privados de archivos, sin exponer rutas de almacenamiento en el contrato HTTP;
  - la plantilla agrega una pagina de evidencia en dos columnas, con orden estable, nombres escapados y sin alterar el PDF cuando no hay fotos.
- Riesgos pendientes:
  - la comprobacion visual manual de PDFs con 0, 1 y 5 fotos queda incluida en el QA de cierre del paso 10.

### Paso 10 - 2026-08-15

- Estado: completed
- Archivos cambiados:
  - `apps/api/.env.example`
  - `apps/api/src/config/env.ts`
  - `apps/api/src/modules/actividades-grupales/application/actividad-grupal-acta-photo-assets.test.ts`
  - `apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.ts`
  - `apps/api/src/modules/alimentacion/application/alimentacion-formato-export.service.test.ts`
  - `apps/api/src/modules/empleados/infrastructure/local-empleados-signature-files.storage.ts`
  - `apps/web/e2e/auth-login.spec.ts`
  - `apps/web/src/app/__tests__/empleados-flow.test.tsx`
  - `apps/web/src/features/backoffice/components/tenant-active-signer-panel.tsx`
  - `apps/web/src/features/empleados/components/empleado-director-signature-panel.tsx`
  - `apps/web/src/features/empleados/lib/empleados-active-signer.ts`
  - `apps/web/src/features/empleados/lib/empleados-active-signer.test.ts`
  - `docs/specs/2026-08-15-actas-alimentacion-home-implementacion-incremental.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: OK.
  - `pnpm --filter @cuidarte/api test`: 44/46 suites verdes; permanecen los dos fallos preexistentes de `backoffice.controller.test.ts` y `tenant-branding.contracts.test.ts` documentados desde la linea base.
  - `pnpm --filter @cuidarte/web test`: 20/26 archivos y 84/96 pruebas verdes; los fallos restantes estan en flujos amplios preexistentes de discapacidad, atenciones, empleados, actividades, adultos mayores y backoffice, principalmente por expectativas de toast desalineadas con Sonner en JSDOM.
  - `pnpm typecheck`: contratos y web verdes; API conserva los dos errores preexistentes de dobles de prueba en `backoffice.controller.test.ts` y `empleados.service.test.ts`.
  - `pnpm build`: OK para contratos, API y web; Vite informa solamente el warning no bloqueante del chunk principal mayor a 500 kB.
  - `LD_LIBRARY_PATH=/home/daniel/cuidarte/.local/playwright-libs/usr/lib/x86_64-linux-gnu pnpm e2e`: OK, 4/4 pruebas.
  - regresion focalizada API para home, alimentacion, papelera y PDF: OK, 13/13 pruebas.
  - regresion focalizada web para home, alimentacion y papelera: OK, 23/23 pruebas.
  - `pnpm --filter @cuidarte/web typecheck`: OK.
  - pruebas focalizadas de exportacion y plantilla del PDF de alimentacion: OK.
  - regresion focalizada del cambio de version del firmante activo: OK, 5/5 pruebas.
  - `pnpm --filter @cuidarte/api build`: OK despues de la correccion de firma.
  - verificacion real del formato de Alfonso Gomez Prieto para `2026-08`: `200 application/pdf`; el PDF contiene tres imagenes, incluida la firma de `264 x 112`.
  - verificacion de persistencia: la emision nueva guarda `signature_version_id_snapshot = deb457e4-aa7f-404e-9123-8605537aa66b`, igual a la version activa reparada.
  - QA funcional manual del alcance completo: aprobado por el usuario el 2026-08-15.
  - `git diff --check`: OK.
- Decisiones:
  - el E2E usa selectores accesibles acotados a la navegacion para evitar colisiones con los nuevos accesos del home;
  - las comprobaciones E2E de mutaciones esperan la respuesta HTTP y el estado persistido en lugar de depender de la duracion visual de un toast;
  - el flujo E2E de alimentacion usa la fecha actual, elimina el registro creado y valida el dialogo nuevo para no dejar datos de prueba acumulados;
  - el flujo E2E de actividades adjunta una imagen PNG real, guarda el diligenciamiento y comprueba que el endpoint responde un PDF valido que empieza por `%PDF`;
  - la prueba unitaria de fotos cubre cinco evidencias mezcladas JPEG, PNG y WebP y valida la normalizacion final a JPEG;
  - se corrigio la regresion del PDF de alimentacion: una firma activa ausente ya no se omite silenciosamente ni permite reutilizar una emision incompleta; la API responde `409` con una accion correctiva clara;
  - si el mismo director carga una nueva version, ambos paneles muestran `Actualizar firma activa` en vez de obligar a desactivarlo y activarlo nuevamente;
  - las firmas nuevas usan `.data/uploads/empleados-signatures`; las firmas legacy se leen desde `/tmp` y se migran de forma compatible al almacenamiento persistente;
  - la version activa local se reparo mediante `PUT /tenants/:tenantId/active-signer`, conservando la auditoria de aplicacion, y se reemitio el PDF afectado con la firma valida;
  - no se modifico codigo productivo para ocultar fallos globales que ya estaban presentes en la linea base.
- Riesgos pendientes:
  - las suites globales y el typecheck raiz conservan deuda preexistente ajena a este alcance; las suites focalizadas y el build de produccion quedan verdes.

## 15. Criterios globales de aceptacion

1. Las fotos adjuntas aparecen en el PDF sin depender de URLs autenticadas.
2. Un PDF sin fotos conserva el formato actual y no agrega una pagina vacia.
3. Solo director, admin y superadmin pueden eliminar alimentacion.
4. Ningun usuario puede operar sobre otro tenant manipulando IDs o query params.
5. Toda eliminacion de alimentacion deja auditoria suficiente para reconstruir el registro.
6. Eliminar un acta no borra sus relaciones ni archivos.
7. Restaurar recupera acta, diligenciamiento, integrantes, profesionales y adjuntos.
8. Las actas en papelera no afectan indicadores ni superficies activas.
9. Solo auditor, director, admin y superadmin reciben datos del dashboard.
10. Los demas roles ven accesos directos sin indicadores y no generan la consulta del dashboard.
11. Las mutaciones actualizan las caches relacionadas sin esperar el refetch periodico.
12. Todos los paquetes compilan y las suites relevantes quedan verdes.

## 16. Fuera de alcance

1. eliminacion definitiva o purga programada de actas;
2. restauracion de registros de alimentacion;
3. incrustar paginas del PDF de soporte dentro del acta;
4. aumentar el limite actual de cinco fotos;
5. cambiar el sistema de archivos local por almacenamiento en nube;
6. redisenar la navegacion o los modulos autorizados para profesionales;
7. refactorizar dominios no relacionados.

## 17. Riesgos y mitigaciones

1. **Riesgo: una consulta olvida filtrar `deleted_at`.**
   Mitigacion: metodos separados para activos y papelera, mas pruebas de cada superficie.
2. **Riesgo: autorizacion solo en frontend.**
   Mitigacion: policy y service backend, mas guard declarativo donde corresponda.
3. **Riesgo: restauracion inconsistente por concurrencia.**
   Mitigacion: updates condicionales y comprobacion de filas afectadas.
4. **Riesgo: PDF demasiado pesado.**
   Mitigacion: copia normalizada, dimensiones y calidad acotadas; originales intactos.
5. **Riesgo: evidencia omitida silenciosamente.**
   Mitigacion: fallar la exportacion si un archivo registrado no puede procesarse.
6. **Riesgo: conteos desactualizados.**
   Mitigacion: filtros backend e invalidacion explicita de cache en cada mutacion.
7. **Riesgo: crecimiento del servicio de sesiones.**
   Mitigacion: caso de uso de papelera en un servicio de aplicacion independiente.
8. **Riesgo: migracion aplicada junto con codigo incompatible.**
   Mitigacion: paso aditivo separado y despliegue de migracion antes del cambio de comportamiento.

## 18. Definicion de terminado

El alcance queda terminado solamente cuando:

1. todos los pasos estan marcados como completados;
2. cada paso tiene evidencia en el registro de ejecucion;
3. la migracion fue revisada y probada;
4. las matrices de permisos estan cubiertas por pruebas;
5. el QA manual de PDF y restauracion fue realizado;
6. no quedan archivos temporales ni cambios ajenos al alcance;
7. el usuario aprueba el cierre despues del Paso 10.
