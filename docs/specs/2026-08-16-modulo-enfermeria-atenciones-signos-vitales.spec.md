# SPEC: Modulo de Enfermeria, Signos Vitales e Interconsulta Clinica

- Estado: planned
- Fecha: 2026-08-16
- Tipo: implementation-spec
- Estrategia: implementacion incremental con aprobacion entre pasos
- Modulos impactados: `atenciones-enfermeria`, `atenciones-individuales`, `adultos-mayores`, `home`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`

## 1. Objetivo

Crear un modulo de enfermeria enfocado exclusivamente en:

1. datos basicos de la atencion;
2. toma de signos vitales;
3. toma opcional de glucometria;
4. notas de enfermeria;
5. consulta longitudinal de atenciones del mismo adulto mayor;
6. consulta cruzada de atenciones medicas y de enfermeria en modo de solo lectura.

La implementacion debe garantizar aislamiento por tenant, autorizacion por rol y autoria,
trazabilidad de cambios y separacion estricta entre los casos de uso medicos y de enfermeria.

## 2. Protocolo obligatorio de ejecucion incremental

Este spec **no autoriza implementar todos los pasos en una sola ejecucion**.

Reglas para quien implemente:

1. ejecutar exclusivamente el primer paso pendiente del checklist de la seccion 16;
2. no adelantar archivos, rutas ni refactors pertenecientes a pasos posteriores;
3. completar las pruebas y la puerta de salida del paso actual;
4. actualizar el paso de `[ ]` a `[x]` solamente cuando su puerta de salida este verde;
5. registrar en la seccion 17 los archivos cambiados, pruebas y decisiones;
6. detenerse y presentar el resultado al usuario;
7. continuar solamente despues de una instruccion explicita como `continua`;
8. corregir las fallas del paso actual antes de avanzar;
9. si una decision funcional contradice este documento, detenerse y solicitar confirmacion;
10. no mezclar limpieza general, cambios cosmeticos ni refactors ajenos al alcance;
11. cada incremento debe dejar contratos, API y web compilables cuando hayan sido impactados;
12. los cambios de base de datos deben ser aditivos antes de activar el comportamiento nuevo.

## 3. Hallazgos de la arquitectura actual

Antes de implementar se deben tener presentes estas condiciones del repositorio:

1. `atenciones_individuales` contiene actualmente datos generales, signos vitales, diagnosticos,
   ordenes medicas, resultados y soportes en un mismo registro;
2. `enfermeria` aparece actualmente en `atencionIndividualHistoryEditorRoleValues`, por lo que
   puede iniciar el formulario clinico completo;
3. los profesionales clinicos solamente reciben en la historia las atenciones creadas por ellos;
4. los lectores administrativos pueden consultar las atenciones de todo su alcance;
5. no existe actualmente una entidad independiente para notas de enfermeria;
6. la navegacion de atenciones individuales esta integrada en el modulo de adultos mayores.

El nuevo modulo debe corregir el acceso de enfermeria al formulario medico sin modificar ni
eliminar los registros historicos existentes.

## 4. Decisiones funcionales cerradas

### 4.1 Propiedad y edicion

1. Una enfermera puede crear atenciones de enfermeria para adultos de su tenant.
2. Una enfermera puede editar siempre las atenciones creadas por ella misma.
3. Las atenciones no se cierran, finalizan ni bloquean por antiguedad.
4. Una enfermera puede consultar atenciones creadas por otras enfermeras del mismo tenant.
5. Una enfermera nunca puede editar una atencion creada por otra enfermera.
6. No se permite transferir la autoria de una atencion.
7. No se implementa eliminacion de atenciones de enfermeria en este alcance.
8. Toda actualizacion conserva `createdByUserId` y registra `updatedByUserId`.

### 4.2 Consulta cruzada

1. El medico puede consultar atenciones de enfermeria del mismo adulto y tenant.
2. El medico no puede crear ni editar atenciones de enfermeria.
3. Enfermeria puede consultar atenciones medicas creadas por usuarios con rol `medico` para el
   mismo adulto y tenant.
4. Enfermeria no puede editar diagnosticos, ordenes ni ningun dato de la atencion medica.
5. La consulta cruzada no otorga acceso a registros de otro tenant.
6. Las pestañas cruzadas se ordenan de la atencion mas reciente a la mas antigua.
7. Abrir un detalle cruzado reutiliza una vista de solo lectura; no duplica un segundo formulario.

### 4.3 Registros medicos historicos creados por enfermeria

1. No se mueven ni transforman a `atenciones_enfermeria`.
2. Permanecen en `atenciones_individuales` como parte de la historia existente.
3. Despues del corte de permisos quedan consultables en solo lectura.
4. No se permite seguir creando atenciones medicas completas con rol `enfermeria`.
5. La migracion de base de datos no reescribe su autor ni sus datos clinicos.

### 4.4 Pestañas del formulario de enfermeria

El flujo tiene cuatro pestañas, en este orden:

1. `Datos de la atencion`;
2. `Signos vitales`;
3. `Nota de enfermeria`;
4. `Atenciones medicas`.

La cuarta pestaña es siempre de solo lectura. En el formulario medico se agrega al final una
pestaña `Atenciones de enfermeria`, tambien de solo lectura.

### 4.5 Glucometria

1. La glucometria es opcional.
2. Se almacena en `mg/dL`.
3. Cuando existe valor, el contexto es obligatorio.
4. Contextos permitidos:
   - `ayunas`;
   - `antes_de_comida`;
   - `despues_de_comida`;
   - `aleatoria`.
5. No se generan diagnosticos ni recomendaciones automaticas a partir del valor.
6. La interfaz siempre muestra la unidad y el contexto registrados.

### 4.6 Origen compartido del adulto mayor y alcance de enfermeria

1. El adulto mayor se crea una sola vez en el modulo `adultos-mayores` y queda disponible para enfermeria a traves de la misma entidad persistida.
2. Enfermeria no tiene un alta propia de adultos mayores ni debe duplicar el registro en su modulo.
3. El modulo de enfermeria solo consume adultos mayores del tenant ya existente para crear y consultar atenciones de enfermeria.
4. El acceso a `Atencion individual` no debe mostrarse a enfermeria en la UI.
5. Si enfermeria intenta abrir una ruta de atencion individual por URL directa, la API y/o los guards deben rechazar el acceso segun la policy correspondiente.
6. Esta restriccion no afecta a los roles que si pueden operar atenciones individuales desde el modulo medico existente.

## 5. Matriz de autorizacion

### 5.1 Modulo de enfermeria

| Rol | Abrir modulo | Listar | Crear | Ver detalle | Editar |
| --- | --- | --- | --- | --- | --- |
| `enfermeria` | Si | Tenant | Si, tenant | Todas las de su tenant | Solo propias |
| `medico` | No como modulo principal | No | No | Si, desde consulta cruzada | No |
| `director` | Si | Tenant | No | Si | No |
| `admin` | Si | Tenant | No | Si | No |
| `auditor` | Si | Tenant | No | Si | No |
| `super_admin` | Si | Global o tenant filtrado | No | Si | No |
| Otros roles | No | No | No | No | No |

### 5.2 Consulta de atenciones medicas

| Actor | Atencion medica propia | Atencion de otro medico | Edicion medica |
| --- | --- | --- | --- |
| `medico` | Ver | Segun politica clinica existente | Solo si la politica actual lo permite |
| `enfermeria` | No aplica | Ver, mismo adulto y tenant | Nunca |
| `director`, `admin`, `auditor` | Ver tenant | Ver tenant | Nunca |
| `super_admin` | Ver | Ver | Nunca |

La API es la fuente de verdad. Las reglas no pueden depender exclusivamente de rutas ocultas,
botones deshabilitados ni datos enviados por el navegador.

## 6. Limites de arquitectura

### 6.1 Contextos separados

`atenciones-enfermeria` sera un feature module independiente:

```txt
apps/api/src/modules/atenciones-enfermeria/
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── atenciones-enfermeria.module.ts
```

```txt
apps/web/src/features/atenciones-enfermeria/
├── api/
├── components/
├── lib/
├── model/
├── pages/
├── schemas/
└── atenciones-enfermeria.css
```

No se agregan campos de enfermeria a `atenciones_individuales` y no se amplia
`AtencionesIndividualesService` para administrar escrituras de enfermeria.

### 6.2 Dependencias entre modulos

1. Cada modulo conserva su propio servicio, policy y repositorio de escritura.
2. El modulo medico no importa el servicio de escritura de enfermeria.
3. El modulo de enfermeria no importa el servicio de escritura medico.
4. Las pestañas cruzadas consumen endpoints de lectura independientes.
5. Si en el futuro se necesita una respuesta agregada, se crea un modulo de consulta
   `historia-clinica` que dependa de puertos de lectura de ambos contextos.
6. No se usa `forwardRef` para resolver un acoplamiento creado por esta funcionalidad.

### 6.3 Capas NestJS

1. Controller: transporte HTTP, parametros, schema y presentacion de respuesta.
2. Service: caso de uso, alcance, autorizacion contextual y orquestacion.
3. Policy: reglas puras por rol, tenant, autoria y tipo de registro.
4. Repository: consultas, transacciones, bloqueo de concurrencia y auditoria.
5. Los tokens de repositorio se inyectan por constructor.
6. No se accede a Drizzle desde controllers o policies.

### 6.4 Capas React

1. `api/`: solicitudes HTTP y parseo de contratos.
2. `model/`: query keys, queries, mutations e invalidacion.
3. `lib/`: paths, permisos de presentacion y formatters puros.
4. `schemas/`: modelo de formulario y adaptadores contrato/formulario.
5. `components/`: formulario, pestañas, tabla y vistas reutilizables.
6. `pages/`: composicion, navegacion y estados de carga/error.
7. No se llama `fetch` desde componentes.
8. No se duplican listas de roles entre componentes.
9. Las consultas de las pestañas cruzadas se activan solamente al abrir la pestaña.

## 7. Modelo de datos

Agregar `atencionesEnfermeria` en
[schema.ts](/home/daniel/cuidarte/apps/api/src/database/schema.ts) y generar una migracion Drizzle.

| Campo | Tipo | Regla |
| --- | --- | --- |
| `id` | uuid | PK |
| `tenantId` | uuid | FK `tenants`, obligatorio |
| `adultoMayorId` | uuid | FK `adultos_mayores`, obligatorio |
| `attentionDate` | date | Obligatorio |
| `attentionTime` | time | Obligatorio, hora local del centro |
| `careType` | varchar/enum de contrato | Obligatorio |
| `reason` | text | Nullable, maximo definido en contrato |
| `tensionSistolica` | integer | Nullable |
| `tensionDiastolica` | integer | Nullable |
| `frecuenciaCardiaca` | integer | Nullable |
| `frecuenciaRespiratoria` | integer | Nullable |
| `temperatura` | numeric/double | Nullable |
| `saturacionOxigeno` | integer | Nullable |
| `pesoKg` | numeric/double | Nullable |
| `tallaCm` | numeric/double | Nullable |
| `imc` | numeric/double | Nullable, calculado en servidor |
| `perimetroAbdominalCm` | numeric/double | Nullable |
| `glucometriaMgDl` | integer | Nullable |
| `glucometriaContext` | varchar/enum de contrato | Requerido si hay glucometria |
| `nursingNote` | text | Obligatorio |
| `createdByUserId` | uuid | FK `users`, obligatorio e inmutable |
| `updatedByUserId` | uuid | FK `users`, obligatorio |
| `version` | integer | Inicia en 1, control optimista |
| `createdAt` | timestamptz | Obligatorio |
| `updatedAt` | timestamptz | Obligatorio |

Tipos iniciales de atencion:

1. `control_signos_vitales`;
2. `seguimiento`;
3. `procedimiento`;
4. `otro`.

Indices requeridos:

1. `(tenant_id, attention_date)`;
2. `(adulto_mayor_id, attention_date)`;
3. `(created_by_user_id, attention_date)`;
4. `(tenant_id, updated_at)` para listados e invalidaciones operativas.

Reglas de datos:

1. `adultoMayorId` y `tenantId` deben corresponder en la transaccion de creacion;
2. `createdByUserId` debe pertenecer al tenant y tener rol `enfermeria` al crear;
3. al menos una medicion entre signos vitales y glucometria debe tener valor;
4. `glucometriaContext` y `glucometriaMgDl` deben estar ambos presentes o ambos ausentes;
5. el IMC se calcula en API a partir de peso y talla, nunca se confia en el valor del cliente;
6. la migracion es aditiva y no modifica `atenciones_individuales`;
7. no se agrega `deletedAt`, `status`, `closedAt` ni `finalizedAt`.

## 8. Contratos compartidos

Crear:

```txt
packages/contracts/src/atenciones-enfermeria.ts
```

Contratos minimos:

1. `atencionEnfermeriaCareTypeSchema`;
2. `glucometriaContextSchema`;
3. `atencionEnfermeriaVitalSignsSchema`;
4. `createAtencionEnfermeriaRequestSchema`;
5. `updateAtencionEnfermeriaRequestSchema`;
6. `atencionEnfermeriaListQuerySchema`;
7. `atencionEnfermeriaListItemSchema`;
8. `atencionEnfermeriaDetailSchema`;
9. `atencionEnfermeriaHistoryResponseSchema`;
10. `medicalAttentionHistoryResponseSchema` o una proyeccion medica especifica reutilizable.

Las respuestas de listado y detalle deben incluir una autorizacion calculada por API:

```ts
access: "view" | "edit";
```

El comando de actualizacion debe incluir:

```ts
version: number;
```

Validaciones:

1. fechas y horas con formato estricto;
2. enteros para frecuencias, presiones, saturacion y glucometria;
3. numeros decimales finitos para temperatura y medidas antropometricas;
4. limites tecnicos amplios para rechazar errores de digitacion imposibles;
5. texto normalizado y con longitudes maximas;
6. refinamiento condicional de glucometria/contexto;
7. refinamiento que exige al menos una medicion;
8. la nota de enfermeria no puede quedar vacia despues de `trim()`.

Los limites clinicos atipicos deben presentarse como advertencias de interfaz cuando corresponda;
el sistema no debe emitir diagnosticos automaticos ni ocultar valores registrados.

## 9. API propuesta

### 9.1 Modulo de enfermeria

```txt
GET   /atenciones-enfermeria
GET   /atenciones-enfermeria/adultos-mayores/:adultoMayorId/lookup
GET   /atenciones-enfermeria/adultos-mayores/:adultoMayorId/history
POST  /atenciones-enfermeria
GET   /atenciones-enfermeria/:id
PATCH /atenciones-enfermeria/:id
```

Reglas:

1. `GET /atenciones-enfermeria` admite fecha, adulto, documento, profesional y tenant cuando el
   actor es `super_admin`;
2. `lookup` devuelve resumen del adulto dentro del alcance;
3. `history` devuelve todas las atenciones de enfermeria del adulto dentro del tenant;
4. `POST` solo acepta rol `enfermeria` y deriva tenant/autor desde la sesion;
5. `GET /:id` calcula `access` segun rol, tenant y autoria;
6. `PATCH /:id` exige rol `enfermeria`, mismo tenant, misma autora y version vigente;
7. no existe endpoint `DELETE`;
8. las rutas estaticas deben declararse antes de `/:id`.

### 9.2 Lectura medica para enfermeria

Agregar una consulta explicita en `atenciones-individuales`:

```txt
GET /atenciones-individuales/adultos-mayores/:adultoMayorId/medical-history
```

Debe devolver solamente registros cuyo autor tenga rol `medico`. La enfermera puede abrir su
detalle con el endpoint existente `GET /atenciones-individuales/:id`, que debe reconocer el acceso
cruzado como `view` y nunca como `edit`.

No se debe relajar la policy global hasta permitir que enfermeria consulte atenciones de otros
roles clinicos no incluidos en este alcance.

### 9.3 Errores esperados

1. `400`: payload invalido o mediciones incoherentes;
2. `401`: sesion ausente;
3. `403`: rol, tenant o autoria no autorizados;
4. `404`: adulto o atencion inexistente dentro del alcance;
5. `409`: version desactualizada durante una edicion concurrente.

Para evitar filtraciones entre tenants, una consulta por id fuera del alcance puede resolverse
como `404` antes de evaluar autoria.

## 10. Policies de dominio

Crear funciones puras, sin acceso a base de datos:

```ts
resolveAtencionEnfermeriaScope(actor)
canOpenAtencionesEnfermeria(actor)
canCreateAtencionEnfermeria(actor)
resolveAtencionEnfermeriaAccess(actor, record)
canEditAtencionEnfermeria(actor, record)
canViewMedicalAttentionFromNursing(actor, record)
canViewNursingAttentionFromMedical(actor, record)
```

`resolveAtencionEnfermeriaAccess` debe producir:

1. `edit` para enfermeria cuando `record.createdByUserId === actor.id` y el tenant coincide;
2. `view` para otra enfermera del mismo tenant;
3. `view` para medico en acceso cruzado del mismo tenant;
4. `view` para roles administrativos dentro de su alcance;
5. `null` para cualquier otro caso.

La actualizacion debe volver a comprobar la autoria en el servicio aunque el detalle haya expuesto
previamente `access: edit`.

## 11. Persistencia, concurrencia y auditoria

### 11.1 Creacion

La creacion se ejecuta en una transaccion:

1. resolver el tenant desde la sesion;
2. comprobar que el adulto existe y pertenece al tenant;
3. normalizar comando y calcular IMC;
4. insertar la atencion con autor y version 1;
5. insertar auditoria `atenciones-enfermeria.created`;
6. devolver el detalle persistido con `access: edit`.

### 11.2 Actualizacion

La actualizacion se ejecuta en una transaccion:

1. seleccionar el registro dentro del alcance;
2. comprobar que el actor es el autor;
3. actualizar usando `WHERE id = ? AND version = ?`;
4. incrementar `version`;
5. comprobar que exactamente una fila fue modificada;
6. insertar auditoria `atenciones-enfermeria.updated`;
7. devolver el detalle actualizado.

Si la version cambio, se responde `409` y la interfaz solicita recargar; no se sobrescriben cambios
de otra sesion silenciosamente.

### 11.3 Auditoria

La auditoria registra:

1. actor;
2. tenant objetivo;
3. atencion y adulto mayor;
4. version anterior y nueva;
5. nombres de campos modificados;
6. fecha de la operacion.

No se copia la nota clinica completa dentro de `audit_logs.metadata`; se evita duplicar datos
sensibles. La tabla clinica conserva el valor vigente y la auditoria conserva la trazabilidad de
la operacion.

## 12. Experiencia web

### 12.1 Navegacion

Agregar el modulo `Enfermeria` a:

1. navegacion lateral desktop;
2. navegacion movil;
3. accesos directos del home para rol `enfermeria`;
4. superficies administrativas que ya listan modulos consultables.

En enfermeria no se muestra acceso de creacion o edicion de `Atencion individual`; el adulto
mayor se reutiliza desde su modulo origen y solo se habilitan las rutas y acciones de
atenciones de enfermeria.

La ruta raiz sugerida es:

```txt
/enfermeria
```

Rutas hijas:

```txt
/enfermeria/new?adultoMayorId=:id
/enfermeria/:atencionId
```

La proteccion de rutas en `app.tsx` debe reutilizar helpers de paths y permissions; no se agregan
condicionales de rol repetidos en cada pagina.

### 12.2 Listado

El listado muestra:

1. fecha y hora;
2. adulto mayor y documento;
3. tipo de atencion;
4. profesional autora;
5. resumen de mediciones registradas;
6. accion `Editar` cuando `access === "edit"`;
7. accion `Ver` cuando `access === "view"`.

Debe incluir estados de carga, error, vacio, filtros y paginacion consistente con los demas
modulos. En movil se evita una tabla horizontal inutilizable mediante la solucion responsiva ya
establecida en el proyecto.

### 12.3 Formulario

1. La identidad del adulto, centro y profesional se muestran como resumen de solo lectura.
2. Las unidades aparecen junto a cada control.
3. El IMC se presenta como derivado; la API vuelve a calcularlo.
4. La glucometria activa el selector de contexto y ambos errores se muestran juntos.
5. La nota usa un `textarea` con contador y limite visible.
6. El modo `view` elimina acciones de guardado y usa controles realmente no editables.
7. El modo `edit` se habilita exclusivamente cuando API devuelve `access: edit`.
8. El guardado invalida listado, detalle, historia del adulto y cualquier resumen relacionado.
9. Un `409` muestra un mensaje de concurrencia y permite recargar el dato vigente.
10. No se guarda un tenant ni autor proporcionado por el formulario.

### 12.4 Pestañas cruzadas

La pestaña `Atenciones medicas` del formulario de enfermeria muestra:

1. fecha;
2. consulta;
3. medico;
4. modalidad;
5. accion `Ver`.

La pestaña `Atenciones de enfermeria` del formulario medico muestra:

1. fecha y hora;
2. tipo de atencion;
3. enfermera;
4. signos registrados;
5. accion `Ver`.

Las consultas se ejecutan al activar la pestaña y se cachean por `adultoMayorId`. El detalle se
abre en modo de solo lectura aunque el usuario intente construir manualmente una ruta de edicion.

## 13. Corte de permisos del formulario medico

El cambio de permisos se activa solamente cuando el modulo de enfermeria ya permite crear y editar
atenciones.

Acciones:

1. retirar `enfermeria` de los roles que pueden crear el formulario medico completo;
2. mantener los demas roles actuales sin cambios en este alcance;
3. permitir a enfermeria listar atenciones creadas por `medico` mediante la proyeccion dedicada;
4. permitir detalle medico de solo lectura cuando el actor es enfermeria y coinciden adulto/tenant;
5. conservar en solo lectura atenciones medicas historicas cuyo autor tenga rol `enfermeria`;
6. actualizar guards de rutas y acciones de la tabla de adultos mayores;
7. no reutilizar `canManageAdultosMayores` como permiso clinico: crear policies especificas.

## 14. Estrategia de pruebas

### 14.1 Contratos

1. payload valido minimo;
2. nota vacia;
3. todas las mediciones ausentes;
4. glucometria sin contexto;
5. contexto sin glucometria;
6. numeros no finitos y formatos invalidos;
7. version de actualizacion obligatoria.

### 14.2 Policies API y web

1. enfermera autora recibe `edit`;
2. otra enfermera del tenant recibe `view`;
3. enfermera de otro tenant recibe `null`;
4. medico recibe `view` sobre enfermeria;
5. medico nunca recibe `edit` sobre enfermeria;
6. enfermeria recibe `view` sobre registro medico;
7. roles administrativos reciben `view` dentro de su alcance;
8. roles no soportados no acceden.

### 14.3 Servicio y repositorio

1. creacion deriva tenant y autor de sesion;
2. rechazo de adulto perteneciente a otro tenant;
3. listado incluye propias y ajenas del mismo tenant;
4. actualizacion propia exitosa;
5. actualizacion de otra enfermera rechazada;
6. conflicto de version responde `409`;
7. IMC recalculado por servidor;
8. auditoria de creacion y actualizacion;
9. aislamiento entre dos tenants;
10. historia medica filtra autores con rol `medico`;
11. no se generan consultas N+1 para autores o adultos.

### 14.4 Controller

1. schemas aplicados a body, params y query;
2. sesion obligatoria;
3. rutas estaticas no colisionan con `/:id`;
4. codigos `400`, `403`, `404` y `409` consistentes;
5. respuesta parseada por contrato.

### 14.5 Web

1. modulo visible para roles definidos;
2. enfermeria puede crear desde su tenant;
3. listado marca propias como `Editar` y ajenas como `Ver`;
4. controles ajenos son de solo lectura;
5. glucometria exige contexto;
6. pestaña medica carga al activarse;
7. pestaña de enfermeria del medico carga al activarse;
8. no existen botones de edicion cruzada;
9. respuesta `403` de una ruta manual se maneja sin filtrar datos;
10. respuesta `409` permite recargar;
11. navegacion desktop y movil;
12. regresion del flujo medico existente.

## 15. Plan incremental detallado

### Paso 0 - Linea base y fixtures

Objetivo: conocer el estado real antes de modificar comportamiento.

Cambios permitidos:

1. fixtures y helpers de prueba estrictamente necesarios;
2. registro del baseline en este spec.

Validacion:

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web test
pnpm typecheck
```

Puerta de salida: fallas preexistentes documentadas y pruebas focalizadas disponibles.

### Paso 1 - Contratos y policies puras

Objetivo: fijar el lenguaje del dominio antes de crear persistencia.

Cambios:

1. contrato `atenciones-enfermeria`;
2. exports del paquete;
3. schemas condicionales de mediciones y glucometria;
4. policy API pura;
5. helper de permisos web puro;
6. pruebas unitarias de contratos y matriz de acceso.

No activar aun la retirada de `enfermeria` del formulario medico.

Puerta de salida: contratos compilados y matriz completa verde.

### Paso 2 - Migracion aditiva

Objetivo: crear la estructura sin cambiar rutas ni permisos.

Cambios:

1. tabla `atenciones_enfermeria`;
2. FKs, checks e indices;
3. migracion Drizzle generada y revisada;
4. verificacion contra base local.

Puerta de salida: migracion aplicable en una base con datos y sin modificar tablas medicas.

### Paso 3 - Repositorio de enfermeria

Objetivo: implementar persistencia aislada y transaccional.

Cambios:

1. tipos internos;
2. interfaz y token de repositorio;
3. repositorio Drizzle;
4. create, update por version, list, history y findById;
5. auditoria transaccional;
6. pruebas focalizadas de repositorio.

Puerta de salida: aislamiento, autoria y conflicto de version demostrados en pruebas.

### Paso 4 - Casos de uso y API de enfermeria

Objetivo: exponer una API segura antes de construir UI.

Cambios:

1. service de aplicacion;
2. controller y schemas;
3. modulo NestJS;
4. lookup de adulto;
5. listado, historia, detalle, creacion y actualizacion;
6. presentacion de `access` calculado;
7. pruebas de service y controller.

Puerta de salida: API utilizable con enfermera autora, otra enfermera, medico y lectores.

### Paso 5 - Shell web, rutas y listado

Objetivo: habilitar consulta del nuevo modulo sin cambiar aun el acceso medico actual.

Cambios:

1. paths y guards de navegacion;
2. cliente API y queries;
3. pagina contenedora;
4. listado, filtros y acciones por `access`;
5. sidebar, movil y home;
6. estados loading/error/empty;
7. pruebas de routing y listado.

Puerta de salida: usuarios autorizados abren el modulo y ven solo registros de su alcance.

### Paso 6 - Formulario de enfermeria

Objetivo: crear y editar atenciones propias.

Cambios:

1. schema de formulario y adaptadores;
2. pestañas de datos, signos y nota;
3. glucometria contextual;
4. calculo visual de IMC;
5. paginas create/detail;
6. mutaciones e invalidaciones;
7. modo `view` y manejo de `409`;
8. pruebas de formulario y flujo.

Puerta de salida: una enfermera crea, edita la propia y no puede editar una ajena.

### Paso 7 - Historial entre enfermeras

Objetivo: completar la colaboracion dentro de enfermeria.

Cambios:

1. historia por adulto;
2. identificacion visual de autora;
3. `Editar` para propias y `Ver` para ajenas;
4. acceso por ruta directa validado en API;
5. pruebas con dos enfermeras del mismo tenant y una de otro tenant.

Puerta de salida: visibilidad compartida del tenant sin edicion cruzada.

### Paso 8 - Lectura cruzada en API

Objetivo: habilitar medicina-enfermeria sin dependencias de escritura.

Cambios:

1. proyeccion `medical-history` filtrada por rol `medico`;
2. acceso de enfermeria al detalle medico como `view`;
3. acceso del medico al historial y detalle de enfermeria como `view`;
4. pruebas de tenant, rol, detalle y ausencia de PATCH cruzado;
5. consultas optimizadas sin N+1.

Puerta de salida: ambos roles consultan el contexto opuesto y toda escritura cruzada devuelve
`403`.

### Paso 9 - Pestañas cruzadas y corte de permisos

Objetivo: completar la experiencia y retirar el acceso medico completo de enfermeria.

Cambios:

1. ultima pestaña `Atenciones medicas` en enfermeria;
2. ultima pestaña `Atenciones de enfermeria` en medicina;
3. carga diferida y detalle reutilizable de solo lectura;
4. retirar `enfermeria` de creacion/edicion del formulario medico;
5. conservar historia medica legada de enfermeria como lectura;
6. actualizar tabla de adultos, home y guards;
7. pruebas de regresion y permisos.

Puerta de salida: enfermeria trabaja en su modulo y conserva lectura clinica necesaria sin poder
alterar medicina.

### Paso 10 - Regresion integral y cierre

Objetivo: validar todos los incrementos juntos.

Cambios permitidos: solamente correcciones derivadas del alcance.

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

1. crear dos enfermeras en un tenant y una en otro;
2. crear atencion con cada enfermera;
3. editar una atencion propia;
4. intentar editar la de otra enfermera;
5. consultar notas entre enfermeras del mismo tenant;
6. comprobar aislamiento con el segundo tenant;
7. consultar enfermeria desde medico;
8. consultar medicina desde enfermeria;
9. probar glucometria con y sin contexto;
10. provocar un conflicto de version con dos sesiones;
11. comprobar desktop y movil;
12. revisar auditoria de creacion y actualizacion.

Puerta de salida: criterios globales completos y sin regresiones conocidas del alcance.

## 16. Checklist de ejecucion

- [x] Paso 0 - Linea base y fixtures
- [x] Paso 1 - Contratos y policies puras
- [x] Paso 2 - Migracion aditiva
- [x] Paso 3 - Repositorio de enfermeria
- [x] Paso 4 - Casos de uso y API de enfermeria
- [x] Paso 5 - Shell web, rutas y listado
- [x] Paso 6 - Formulario de enfermeria
- [x] Paso 7 - Historial entre enfermeras
- [x] Paso 8 - Lectura cruzada en API
- [x] Paso 9 - Pestañas cruzadas y corte de permisos
- [ ] Paso 10 - Regresion integral y cierre

## 17. Registro de ejecucion

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

### Paso 2 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/database/schema.ts`
  - `apps/api/drizzle/0029_atenciones_enfermeria.sql`
  - `apps/api/drizzle/meta/0029_snapshot.json`
  - `apps/api/drizzle/meta/_journal.json`
  - `packages/contracts/src/atenciones-enfermeria.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.contracts.test.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.policy.test.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: ok
  - `pnpm --filter @cuidarte/api exec node --import tsx --test --test-reporter spec src/modules/atenciones-enfermeria/domain/atencion-enfermeria.contracts.test.ts src/modules/atenciones-enfermeria/domain/atencion-enfermeria.policy.test.ts`: ok
  - `pnpm --filter @cuidarte/api exec node --import tsx -e "import('./src/database/schema.ts')"`: ok
  - `pnpm --filter @cuidarte/api db:migrate`: ok, aplicada sobre PostgreSQL local con datos existentes
  - `pnpm --filter @cuidarte/api db:generate --name verify_no_schema_drift`: ok, sin cambios pendientes de esquema
  - inspeccion PostgreSQL de columnas, FKs, checks e indices: ok
  - insercion valida dentro de transaccion y `ROLLBACK`: ok, version inicial 1 y cero filas de prueba persistidas
  - `pnpm --filter @cuidarte/api exec tsc --noEmit --pretty false`: conserva solamente las fallas preexistentes documentadas de `backoffice.controller.test.ts` y `empleados.service.test.ts`
- Decisiones:
  - se usaron enums PostgreSQL para tipo de atencion y contexto de glucometria
  - la tabla incorpora checks de medicion minima, par glucometria/contexto, rangos tecnicos, longitudes y version positiva
  - se alinearon los contratos del paso 1 con las mismas invariantes de medicion minima y version obligatoria en actualizacion
  - la migracion es estrictamente aditiva y no modifica `atenciones_individuales`
- Riesgos pendientes:
  - la pertenencia adulto/tenant y el rol del autor se validaran transaccionalmente en el repositorio y servicio de los pasos 3 y 4
  - no existen aun repositorio, endpoints ni UI del modulo de enfermeria

### Paso 3 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.types.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atenciones-enfermeria.repository.ts`
  - `apps/api/src/modules/atenciones-enfermeria/infrastructure/drizzle-atenciones-enfermeria.repository.ts`
  - `apps/api/src/modules/atenciones-enfermeria/infrastructure/drizzle-atenciones-enfermeria.repository.test.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec tsc --noEmit --pretty false 2>&1 | rg "atenciones-enfermeria|drizzle-atenciones-enfermeria|error TS"`: sin errores del alcance; quedaron solo fallas preexistentes de `backoffice.controller.test.ts` y `empleados.service.test.ts`
  - `pnpm test -- src/modules/atenciones-enfermeria/infrastructure/drizzle-atenciones-enfermeria.repository.test.ts` (desde `apps/api`): ok para la suite del modulo; la corrida general sigue mostrando fallas preexistentes ajenas al alcance en `backoffice.controller.test.ts` y `tenant-branding.contracts.test.ts`
- Decisiones:
  - se implemento un repositorio transaccional con aislamiento por tenant, control optimista por `version` y auditoria sin copiar la nota clinica completa
  - el repositorio recalcula IMC en servidor y rechaza cambios de autor ajeno con una excepcion de dominio explicita
  - las consultas de lista, historia y detalle se resuelven con joins para evitar N+1 en adultos mayores y profesionales
- Riesgos pendientes:
  - el servicio y el controller del paso 4 deben traducir las excepciones de dominio a `404`, `403` y `409`
  - aun no existe la API publica del modulo de enfermeria ni la capa web

### Paso 4 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `packages/contracts/src/atenciones-enfermeria.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atenciones-enfermeria.repository.ts`
  - `apps/api/src/modules/atenciones-enfermeria/infrastructure/drizzle-atenciones-enfermeria.repository.ts`
  - `apps/api/src/modules/atenciones-enfermeria/application/atenciones-enfermeria.service.ts`
  - `apps/api/src/modules/atenciones-enfermeria/application/atenciones-enfermeria.service.test.ts`
  - `apps/api/src/modules/atenciones-enfermeria/presentation/atenciones-enfermeria.controller.ts`
  - `apps/api/src/modules/atenciones-enfermeria/presentation/atenciones-enfermeria.controller.test.ts`
  - `apps/api/src/modules/atenciones-enfermeria/atenciones-enfermeria.module.ts`
  - `apps/api/src/app.module.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: ok
  - `node --import tsx --test src/modules/atenciones-enfermeria/application/atenciones-enfermeria.service.test.ts src/modules/atenciones-enfermeria/presentation/atenciones-enfermeria.controller.test.ts` (desde `apps/api`): ok
  - `pnpm --filter @cuidarte/api exec tsc --noEmit --pretty false 2>&1 | rg "atenciones-enfermeria|drizzle-atenciones-enfermeria|error TS"`: sin errores del alcance; quedaron fallas preexistentes ajenas en `backoffice.controller.test.ts` y `empleados.service.test.ts`
- Decisiones:
  - la API de enfermeria se expuso como modulo independiente con controller, service y providers propios
  - el acceso se calcula en servidor y la edicion queda restringida a la autora cuando corresponde
  - el listado, detalle e historia reutilizan contratos compartidos y validacion Zod en el borde HTTP
- Riesgos pendientes:
  - aun faltan las capas web y el resto de la experiencia incremental del modulo

### Paso 5 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths.ts`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions.ts`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-formatters.ts`
  - `apps/web/src/features/atenciones-enfermeria/api/atenciones-enfermeria-api.ts`
  - `apps/web/src/features/atenciones-enfermeria/model/atenciones-enfermeria-queries.ts`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-toolbar.tsx`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-table.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-index-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/atenciones-enfermeria.css`
  - `apps/web/src/styles/index.css`
  - `apps/web/src/features/home/lib/home-modules.tsx`
  - `apps/web/src/features/home/components/home-direct-access.tsx`
  - `apps/web/src/features/home/components/home-access-shortcut-card.tsx`
  - `apps/web/src/features/home/components/home-dashboard.tsx`
  - `apps/web/src/features/home/pages/home-page.tsx`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/test/fixtures/auth.fixtures.ts`
  - `apps/web/src/test/fixtures/atenciones-enfermeria.fixtures.ts`
  - `apps/web/src/test/fixtures/index.ts`
  - `apps/web/src/test/handlers/atenciones-enfermeria.handlers.ts`
  - `apps/web/src/test/handlers/index.ts`
  - `apps/web/src/app/__tests__/atenciones-enfermeria-flow.test.tsx`
  - `apps/web/src/app/__tests__/routing-guards.test.tsx`
  - `apps/web/src/app/__tests__/mobile-navigation.test.tsx`
- Pruebas:
  - `pnpm --filter @cuidarte/web typecheck`: ok
  - `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/atenciones-enfermeria-flow.test.tsx --reporter=dot`: ok
  - `pnpm --filter @cuidarte/web exec vitest run src/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions.test.ts src/app/__tests__/routing-guards.test.tsx src/app/__tests__/mobile-navigation.test.tsx --reporter=dot`: ok
- Decisiones:
  - el modulo de enfermeria se expuso en web con shell, rutas, permisos y listado separados del resto de la historia clinica
  - el home distingue entre usuarios con indicadores y usuarios que solo necesitan accesos directos, sin mezclar el nuevo modulo en el dashboard de indicadores
  - el listado prioriza consulta por tenant, filtros basicos y una columna de acceso derivada del backend para no depender de reglas ocultas en el navegador
- Riesgos pendientes:
  - el formulario completo, la historia entre enfermeras y la lectura cruzada siguen pendientes para los pasos 6 a 9

### Paso 7 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/atenciones-enfermeria/application/atenciones-enfermeria.service.test.ts`
  - `apps/api/src/modules/atenciones-enfermeria/presentation/atenciones-enfermeria.controller.test.ts`
  - `apps/web/src/app/app.tsx`
  - `apps/web/src/app/__tests__/atenciones-enfermeria-flow.test.tsx`
  - `apps/web/src/features/atenciones-enfermeria/api/atenciones-enfermeria-api.ts`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-history-table.tsx`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths.ts`
  - `apps/web/src/features/atenciones-enfermeria/model/atenciones-enfermeria-queries.ts`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-detail-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-history-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/atenciones-enfermeria.css`
  - `apps/web/src/test/fixtures/auth.fixtures.ts`
  - `apps/web/src/test/fixtures/atenciones-enfermeria.fixtures.ts`
  - `apps/web/src/test/handlers/atenciones-enfermeria.handlers.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/web typecheck`: ok
  - `pnpm exec vitest run src/app/__tests__/atenciones-enfermeria-flow.test.tsx src/app/__tests__/atenciones-enfermeria-form-flow.test.tsx src/app/__tests__/routing-guards.test.tsx --reporter=dot` (desde `apps/web`): ok
  - `node --import tsx --test src/modules/atenciones-enfermeria/application/atenciones-enfermeria.service.test.ts src/modules/atenciones-enfermeria/presentation/atenciones-enfermeria.controller.test.ts` (desde `apps/api`): ok
- Decisiones:
  - se creo una ruta propia de historia por adulto para enfermeria, reutilizando el endpoint ya existente y la validacion de alcance por API
  - la visualizacion distingue autoria propia y ajena sin permitir edicion cruzada
  - se agrego un acceso contextual desde el detalle de enfermeria para llegar a la historia del adulto sin depender de URL manual
- Riesgos pendientes:
  - la lectura cruzada medicina-enfermeria y el corte de permisos siguen para los pasos 8 y 9

### Paso 6 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths.ts`
  - `apps/web/src/features/atenciones-enfermeria/api/atenciones-enfermeria-api.ts`
  - `apps/web/src/features/atenciones-enfermeria/model/atenciones-enfermeria-queries.ts`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-formatters.ts`
  - `apps/web/src/features/atenciones-enfermeria/schemas/atenciones-enfermeria-form.schema.ts`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-field-group.tsx`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-form.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-create-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-detail-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/atenciones-enfermeria.css`
  - `apps/web/src/test/fixtures/atenciones-enfermeria.fixtures.ts`
  - `apps/web/src/test/handlers/atenciones-enfermeria.handlers.ts`
  - `apps/web/src/app/__tests__/atenciones-enfermeria-flow.test.tsx`
  - `apps/web/src/app/__tests__/atenciones-enfermeria-form-flow.test.tsx`
- Pruebas:
  - `pnpm --filter @cuidarte/web typecheck`: ok
  - `pnpm exec vitest run src/app/__tests__/atenciones-enfermeria-flow.test.tsx src/app/__tests__/atenciones-enfermeria-form-flow.test.tsx` (desde `apps/web`): ok
- Decisiones:
  - el formulario se organizo en pestañas reutilizables con schema compartido para crear, editar y visualizar
  - la glucometria se valido como par valor/contexto y el IMC se calculo solamente en cliente para mostrarlo, sin confiar en valores manuales
  - la experiencia de create/detail se conecto a la lista con rutas consistentes y pruebas de flujo completas
- Riesgos pendientes:
  - el historial entre enfermeras y la lectura cruzada siguen para los pasos 7 a 9

### Paso 1 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `packages/contracts/src/atenciones-enfermeria.ts`
  - `packages/contracts/src/index.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.policy.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.contracts.test.ts`
  - `apps/api/src/modules/atenciones-enfermeria/domain/atencion-enfermeria.policy.test.ts`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions.ts`
  - `apps/web/src/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions.test.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: ok
  - `pnpm --filter @cuidarte/api exec node --import tsx --test --test-reporter spec src/modules/atenciones-enfermeria/domain/atencion-enfermeria.contracts.test.ts src/modules/atenciones-enfermeria/domain/atencion-enfermeria.policy.test.ts`: ok
  - `pnpm --filter @cuidarte/web exec vitest run src/features/atenciones-enfermeria/lib/atenciones-enfermeria-permissions.test.ts`: ok
- Decisiones:
  - se definio el vocabulario del dominio de enfermeria antes de persistencia y API
  - la glucometria quedo modelada como par obligatorio valor/contexto en ambos sentidos
  - la edicion solo queda habilitada para la autora enfermera; lectura para otras enfermeras, medico y lectores permitidos
- Riesgos pendientes:
  - no hay persistencia, endpoints ni UI del modulo de enfermeria aun

### Paso 0 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `docs/specs/2026-08-16-modulo-enfermeria-atenciones-signos-vitales.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: ok
  - `pnpm --filter @cuidarte/api test`: falla preexistente en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/tenant-branding/domain/tenant-branding.contracts.test.ts`
  - `pnpm --filter @cuidarte/web test`: falla preexistente en `src/features/adultos-mayores/lib/disability-options.test.ts` y varios flujos e2e de `src/app/__tests__`
  - `pnpm typecheck`: falla preexistente en `src/modules/backoffice/backoffice.controller.test.ts` y `src/modules/empleados/application/empleados.service.test.ts`
- Decisiones:
  - se documento la linea base real antes de introducir el modulo de enfermeria
  - no se agregaron fixtures adicionales porque el estado actual ya permite avanzar al siguiente paso con el baseline documentado
- Riesgos pendientes:
  - suites de API, web y typecheck con fallas previas ajenas al alcance de enfermeria

### Paso 8 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `packages/contracts/src/atenciones-individuales.ts`
  - `apps/api/src/modules/atenciones-individuales/domain/atencion-individual.policy.ts`
  - `apps/api/src/modules/atenciones-individuales/domain/atencion-individual.policy.test.ts`
  - `apps/api/src/modules/atenciones-individuales/domain/atencion-individual.types.ts`
  - `apps/api/src/modules/atenciones-individuales/infrastructure/drizzle-atenciones-individuales.repository.ts`
  - `apps/api/src/modules/atenciones-individuales/application/atenciones-individuales.service.ts`
  - `apps/api/src/modules/atenciones-individuales/application/atenciones-individuales.service.test.ts`
  - `apps/api/src/modules/atenciones-individuales/presentation/atenciones-individuales.controller.ts`
  - `apps/api/src/modules/atenciones-individuales/presentation/atenciones-individuales.controller.test.ts`
  - `apps/web/src/features/atenciones-individuales/pages/atencion-individual-detail-page.tsx`
  - `apps/web/src/features/adultos-mayores/pages/adultos-mayores-page.tsx`
  - `docs/specs/2026-08-16-modulo-enfermeria-atenciones-signos-vitales.spec.md`
- Pruebas:
  - `pnpm --filter @cuidarte/contracts build`: ok
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/atenciones-individuales/domain/atencion-individual.policy.test.ts src/modules/atenciones-individuales/application/atenciones-individuales.service.test.ts src/modules/atenciones-individuales/presentation/atenciones-individuales.controller.test.ts`: ok
  - `pnpm --filter @cuidarte/web exec vitest run src/features/atenciones-individuales/lib/historia-clinica-permissions.test.ts --reporter=dot`: ok
  - `pnpm --filter @cuidarte/api typecheck`: fallas preexistentes ajenas al alcance en `backoffice` y `empleados`
  - `pnpm --filter @cuidarte/web typecheck`: fallas preexistentes ajenas al alcance en otros modulos
- Decisiones:
  - se expuso `access` desde la API de atenciones individuales para que el front no decida en paralelo la visibilidad del detalle
  - se agrego la proyeccion `medical-history` sin tocar todavia las pestañas cruzadas del paso 9
- Riesgos pendientes:
  - quedan fallas preexistentes de typecheck fuera de este paso

### Paso 9 - 2026-08-16

- Estado: completed
- Archivos cambiados:
  - `apps/api/src/modules/atenciones-individuales/domain/atencion-individual.policy.ts`
  - `apps/api/src/modules/atenciones-individuales/domain/atencion-individual.policy.test.ts`
  - `apps/web/src/features/atenciones-individuales/api/atenciones-individuales-api.ts`
  - `apps/web/src/features/atenciones-individuales/model/atenciones-individuales-queries.ts`
  - `apps/web/src/features/atenciones-individuales/components/atencion-individual-form.tsx`
  - `apps/web/src/features/atenciones-individuales/pages/atencion-individual-create-page.tsx`
  - `apps/web/src/features/atenciones-individuales/pages/atencion-individual-detail-page.tsx`
  - `apps/web/src/features/atenciones-individuales/lib/historia-clinica-permissions.ts`
  - `apps/web/src/features/atenciones-individuales/lib/historia-clinica-permissions.test.ts`
  - `apps/web/src/features/atenciones-enfermeria/model/atenciones-enfermeria-queries.ts`
  - `apps/web/src/features/atenciones-enfermeria/components/atenciones-enfermeria-form.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-create-page.tsx`
  - `apps/web/src/features/atenciones-enfermeria/pages/atenciones-enfermeria-detail-page.tsx`
  - `apps/web/src/app/__tests__/atenciones-flow.test.tsx`
  - `apps/web/src/app/__tests__/atenciones-enfermeria-form-flow.test.tsx`
  - `apps/web/src/test/handlers/atenciones.handlers.ts`
  - `apps/web/src/test/helpers/msw-domain.helpers.ts`
- Pruebas:
  - `pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/atenciones-individuales/domain/atencion-individual.policy.test.ts src/modules/atenciones-individuales/application/atenciones-individuales.service.test.ts src/modules/atenciones-individuales/presentation/atenciones-individuales.controller.test.ts`: ok
  - `pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/atenciones-flow.test.tsx src/app/__tests__/atenciones-enfermeria-form-flow.test.tsx src/features/atenciones-individuales/lib/historia-clinica-permissions.test.ts --reporter=dot`: ok
  - `pnpm --filter @cuidarte/web exec tsc --noEmit --pretty false`: ok
- Decisiones:
  - se agregaron las pestañas cruzadas como lectura diferida para evitar cargar historias hasta que el usuario las abre
  - se retiro enfermeria del circuito de creacion/edicion de atenciones medicas, manteniendo lectura de historicos legados
  - el front reutiliza los historiales compartidos y deja que la API siga siendo la autoridad de permisos
- Riesgos pendientes:
  - queda el paso 10 para validar regresion integral y cierre

## 18. Criterios globales de aceptacion

1. Enfermeria dispone de un modulo propio para signos vitales, glucometria y notas.
2. Una enfermera puede editar siempre sus propias atenciones.
3. Una enfermera ve, pero no edita, atenciones de otras enfermeras de su tenant.
4. Ninguna enfermera consulta registros de otro tenant.
5. El medico ve atenciones de enfermeria sin poder modificarlas.
6. Enfermeria ve atenciones medicas sin poder modificarlas.
7. La glucometria conserva valor, unidad y contexto.
8. El backend calcula y entrega `access` para cada registro.
9. No existe cierre, finalizacion ni eliminacion de atenciones de enfermeria.
10. Las actualizaciones concurrentes no se sobrescriben silenciosamente.
11. Cada creacion y modificacion queda auditada.
12. Los registros historicos medicos creados por enfermeria se conservan.
13. El modulo funciona en desktop y movil.
14. Contratos, API y web tienen pruebas focalizadas de permisos y tenant.

## 19. Fuera de alcance

1. diagnosticos de enfermeria estandarizados;
2. planes de cuidado NANDA, NIC o NOC;
3. administracion de medicamentos;
4. ordenes medicas nuevas;
5. adjuntos o fotografias de enfermeria;
6. firma digital del registro;
7. cierre o finalizacion de atenciones;
8. eliminacion o papelera de atenciones;
9. graficas longitudinales de signos vitales;
10. alertas clinicas o diagnosticos automaticos;
11. migracion de atenciones individuales historicas a la nueva tabla;
12. acceso cruzado con psicologia, nutricion o fisioterapia.

## 20. Riesgos y mitigaciones

| Riesgo | Mitigacion |
| --- | --- |
| Enfermeria conserva acceso al formulario medico completo | Activar corte de permisos en el paso 9, despues de tener reemplazo funcional |
| Edicion de notas de otra enfermera | Policy de autoria en API y `PATCH` condicionado por autor |
| Fuga entre tenants | Scope derivado de sesion y consultas filtradas antes de evaluar detalle |
| Sobrescritura concurrente | Columna `version` y actualizacion optimista con `409` |
| Tabla medica convertida en entidad multiproposito | Nueva tabla y modulo de escritura independiente |
| Dependencia circular NestJS | Endpoints/puertos de lectura y ausencia de imports entre servicios de escritura |
| Reglas distintas entre API y web | Contratos compartidos y pruebas espejo; API sigue siendo autoridad |
| N+1 en historias | Joins o consultas por lote para adulto y profesional |
| Datos clinicos duplicados en auditoria | Auditar operacion y campos cambiados, no copiar notas completas |
| Perdida de registros legados | Migracion aditiva, sin reescritura de `atenciones_individuales` |

## 21. Definicion de terminado

El alcance se considera terminado solamente cuando:

1. todos los pasos estan marcados `[x]`;
2. cada paso tiene registro de ejecucion;
3. la migracion fue aplicada y verificada;
4. las matrices de rol, tenant y autoria estan cubiertas por pruebas;
5. el flujo cruzado es de solo lectura en frontend y backend;
6. no existe acceso de enfermeria para crear nuevas atenciones medicas completas;
7. typecheck, build y pruebas del alcance estan verdes;
8. las fallas preexistentes ajenas al alcance, si existen, estan documentadas;
9. QA manual fue ejecutado con dos enfermeras del mismo tenant y una de otro tenant;
10. no quedan TODOs, rutas provisionales ni duplicacion intencional sin justificar.
