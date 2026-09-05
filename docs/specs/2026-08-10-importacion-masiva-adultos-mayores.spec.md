# SPEC: Importacion Masiva de Adultos Mayores por Tenant

- Estado: proposed
- Fecha: 2026-08-10
- Modulo funcional: `adultos-mayores`
- Superficie administrativa: `importacion-adultos-mayores`
- Alcance: plantilla Excel, validacion previa, confirmacion transaccional y auditoria
- Roles autorizados: `super_admin`, `admin`

## 1. Objetivo

Permitir que un usuario `admin` o `super_admin` importe masivamente adultos mayores desde una plantilla Excel controlada por CuidarTe, con aislamiento estricto por tenant, validacion completa antes de escribir, confirmacion explicita, manejo determinista de duplicados y trazabilidad del lote.

La implementacion debe integrarse con el dominio existente de Adultos Mayores. No debe crear una segunda fuente de verdad, duplicar las reglas del alta individual ni confiar en identificadores de tenant incluidos por el navegador o por el archivo.

## 2. Resultado funcional esperado

1. Admin y SuperAdmin ven un acceso llamado `Importar adultos mayores`.
2. Cualquier otro rol queda excluido de la navegacion, de la ruta web y de la API.
3. El usuario puede descargar una plantilla `.xlsx` versionada.
4. El Admin ve su centro de solo lectura; no selecciona ni envia un tenant.
5. El SuperAdmin debe seleccionar un centro activo antes de validar el archivo.
6. El archivo se valida por completo sin insertar adultos mayores.
7. La interfaz presenta conteos, advertencias y errores por fila.
8. Si hay errores bloqueantes, la importacion no se puede confirmar.
9. Si no hay errores, el usuario confirma el lote de forma explicita.
10. La confirmacion crea todos los registros nuevos en una sola transaccion.
11. Los adultos ya existentes en el tenant se omiten y nunca se actualizan silenciosamente.
12. El resultado queda asociado al usuario actor, tenant, checksum y lote de importacion.

## 3. Decisiones de arquitectura

### 3.1 Propiedad del dominio

La importacion pertenece a `adultos-mayores`.

Se puede presentar como modulo administrativo independiente en la navegacion, pero su codigo backend debe permanecer dentro de:

```txt
apps/api/src/modules/adultos-mayores
```

Y su codigo web dentro de:

```txt
apps/web/src/features/adultos-mayores
```

No se creara un dominio raiz paralelo llamado `imports`, porque el archivo, las reglas, los duplicados y la persistencia pertenecen especificamente a Adultos Mayores.

### 3.2 Asignacion del tenant

El archivo nunca tendra una columna `tenant_id`, `tenantId`, centro o equivalente.

La fuente de verdad del tenant sera:

| Actor         | Fuente del tenant                                                   |
| ------------- | ------------------------------------------------------------------- |
| `admin`       | `currentUser.tenantId`, obtenido por el backend desde la sesion     |
| `super_admin` | `tenantId` seleccionado fuera del archivo y validado por el backend |

Reglas obligatorias:

1. Un Admin sin `tenantId` recibe `403`.
2. Si un Admin envia un `tenantId`, la API rechaza la solicitud; no lo ignora silenciosamente.
3. Un SuperAdmin sin tenant seleccionado recibe `400`.
4. El tenant del SuperAdmin debe existir y estar activo.
5. El tenant resuelto se guarda en el lote y no puede cambiar entre validacion y confirmacion.
6. Todas las consultas, staging, duplicados e inserciones deben incluir el tenant resuelto.

### 3.3 Politica de escritura del MVP

La primera version sera `create-only`:

1. crea adultos que no existen en el tenant;
2. omite adultos ya existentes en el tenant;
3. no actualiza registros existentes;
4. no hace merge de campos vacios;
5. no permite elegir una estrategia `crear o actualizar` desde la UI.

La actualizacion masiva se considerara en un spec separado que incluya comparacion antes/despues y aprobacion explicita de cambios.

### 3.4 Validacion y confirmacion separadas

La carga se divide en dos casos de uso:

1. `validateImport`: parsea, normaliza, valida y crea un lote temporal;
2. `confirmImport`: bloquea el lote, verifica que siga vigente y realiza la insercion.

Validar nunca inserta en `adultos_mayores`.

### 3.5 Procesamiento sin cola en el MVP

El MVP procesa de forma sincrona:

1. maximo 1.000 filas de datos;
2. maximo 10 MiB por archivo;
3. un unico archivo `.xlsx` por solicitud;
4. consultas masivas de catalogos y duplicados;
5. inserciones por bloques dentro de una unica transaccion.

Redis o una cola de trabajos quedan fuera del MVP. Si los archivos reales superan el limite o la concurrencia vuelve insuficiente el procesamiento sincrono, se disenara un worker en una fase posterior sin cambiar el contrato funcional de validar y confirmar.

## 4. Flujo de usuario

```txt
Abrir modulo
      |
      v
Descargar plantilla
      |
      v
Resolver centro destino
Admin: sesion | SuperAdmin: selector obligatorio
      |
      v
Seleccionar archivo .xlsx
      |
      v
Validar sin escribir
      |
      +---- errores ----> mostrar resumen + descargar reporte + cargar archivo corregido
      |
      +---- sin errores -> confirmar importacion
                              |
                              v
                       transaccion atomica
                              |
                              v
                  creados + omitidos + auditoria
```

### 4.1 Estado inicial

La pantalla muestra:

1. titulo `Importar adultos mayores`;
2. descripcion corta del flujo;
3. centro de destino;
4. boton `Descargar plantilla`;
5. selector o zona de carga de archivo;
6. limites de formato, peso y filas;
7. enlace de regreso a Adultos Mayores.

### 4.2 Centro de destino

Admin:

1. muestra nombre del centro en un campo de solo lectura;
2. no renderiza selector;
3. no incluye `tenantId` en la solicitud.

SuperAdmin:

1. reutiliza las opciones de tenants activos ya disponibles en Adultos Mayores;
2. usa un selector buscable cuando el numero de tenants haga insuficiente un `select` simple;
3. bloquea la carga mientras no exista seleccion;
4. limpia cualquier archivo o validacion anterior cuando el usuario cambia de tenant.

### 4.3 Seleccion del archivo

1. Acepta visualmente solo `.xlsx`.
2. Muestra nombre y tamano antes de validar.
3. Permite reemplazar el archivo antes del envio.
4. Deshabilita doble envio mientras la validacion esta pendiente.
5. La validacion frontend es solo feedback temprano; la API repite todas las reglas.

### 4.4 Resultado de validacion

Mostrar como minimo:

| Indicador         | Significado                                          |
| ----------------- | ---------------------------------------------------- |
| Filas leidas      | Filas no vacias encontradas                          |
| Listas para crear | Filas validas que no existen en el tenant            |
| Ya existentes     | Coincidencias por tenant, tipo y numero de documento |
| Con advertencias  | Filas confirmables que requieren atencion            |
| Con errores       | Filas que impiden confirmar                          |

La tabla de problemas muestra:

1. numero de fila Excel;
2. columna;
3. valor visible truncado y saneado;
4. severidad `error` o `warning`;
5. mensaje de negocio;
6. codigo estable del problema.

La pantalla puede mostrar los primeros 100 problemas. El reporte descargable debe contenerlos todos.

### 4.5 Confirmacion

1. Solo se habilita si el lote esta `ready`.
2. Muestra tenant, filas nuevas y filas omitidas.
3. Requiere una accion explicita `Confirmar importacion`.
4. El boton queda deshabilitado durante la mutacion.
5. Un segundo clic o reintento de red no crea duplicados.
6. Al finalizar, se invalida el listado de Adultos Mayores y el resumen del inicio.

## 5. Contrato de la plantilla Excel

### 5.1 Archivo

Nombre sugerido:

```txt
plantilla-importacion-adultos-mayores-v1.xlsx
```

El workbook sera generado por el backend con ExcelJS. No se mantendra un binario manual dentro del frontend.

### 5.2 Hojas

| Hoja              | Proposito                                                      |
| ----------------- | -------------------------------------------------------------- |
| `Adultos mayores` | Hoja editable con encabezados y una fila de ejemplo            |
| `Instrucciones`   | Reglas de diligenciamiento, campos obligatorios y convenciones |
| `Catalogos`       | Valores permitidos para enums y catalogos funcionales          |
| `Ubicaciones`     | Codigos DIVIPOLA, departamento y municipio                     |
| `EPS`             | Codigo y nombre de EPS activas al generar la plantilla         |
| `_metadata`       | Hoja oculta con version de plantilla y fecha de generacion     |

La plantilla es global y no contiene datos del tenant. No es necesario seleccionar un centro para descargarla.

### 5.3 Version

La hoja `_metadata` incluye como minimo:

```txt
template_key = adultos-mayores-import
template_version = 1
generated_at = ISO-8601
```

La API rechaza:

1. archivos sin metadata;
2. otra `template_key`;
3. versiones no soportadas;
4. encabezados que no correspondan a la version declarada.

La evolucion de columnas se hace incrementando `template_version`; no se reinterpretan silenciosamente plantillas antiguas.

### 5.4 Columnas

Los encabezados tecnicos son estables, en `snake_case`, sin tildes. Las instrucciones y listas visibles permanecen en espanol.

| Encabezado                       | Req. | Formato o valores                                   | Destino de dominio             |
| -------------------------------- | ---- | --------------------------------------------------- | ------------------------------ |
| `tipo_documento`                 | Si   | `CC`, `CE`, `Pasaporte`, `Otro`                     | `documentType`                 |
| `numero_documento`               | Si   | Texto, maximo 80                                    | `documentNumber`               |
| `primer_nombre`                  | Si   | Texto, maximo 80                                    | `firstName`                    |
| `segundo_nombre`                 | No   | Texto, maximo 80                                    | `middleName`                   |
| `primer_apellido`                | Si   | Texto, maximo 80                                    | `firstSurname`                 |
| `segundo_apellido`               | No   | Texto, maximo 80                                    | `secondSurname`                |
| `fecha_nacimiento`               | Si   | `YYYY-MM-DD`                                        | `birthDate`                    |
| `sexo`                           | Si   | `Femenino`, `Masculino`, `Otro`                     | `sex`                          |
| `nivel_academico`                | No   | Valor de `Catalogos`                                | `educationLevel`               |
| `discapacidad`                   | No   | Valor de `Catalogos`                                | `disability`                   |
| `grupo_poblacional`              | No   | Valor de `Catalogos`                                | `populationGroup`              |
| `direccion`                      | Si   | Texto, maximo 220                                   | `address`                      |
| `codigo_departamento`            | Si   | Codigo DIVIPOLA de 2 caracteres, tratado como texto | resolucion de `departmentId`   |
| `codigo_municipio`               | Si   | Codigo DIVIPOLA de 5 caracteres, tratado como texto | resolucion de `municipalityId` |
| `zona`                           | Si   | `Urbana`, `Rural`                                   | `zone`                         |
| `pais`                           | No   | Texto; vacio usa `Colombia`                         | `country`                      |
| `telefono`                       | No   | Texto, maximo 40                                    | `phone`                        |
| `telefono_secundario`            | No   | Texto, maximo 40                                    | `phoneSecondary`               |
| `correo`                         | No   | Correo valido, maximo 320                           | `email`                        |
| `contacto_emergencia_nombre`     | No   | Texto, maximo 180                                   | `emergencyContactFullName`     |
| `contacto_emergencia_parentesco` | No   | Texto, maximo 80                                    | `emergencyContactRelationship` |
| `contacto_emergencia_telefono`   | No   | Texto, maximo 40                                    | `emergencyContactPhone`        |
| `contacto_emergencia_direccion`  | No   | Texto, maximo 220                                   | `emergencyContactAddress`      |
| `tipo_sangre`                    | No   | `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`    | `bloodType`                    |
| `sisben`                         | No   | Texto, maximo 40                                    | `sisben`                       |
| `regimen_salud`                  | No   | Valor canonico de `Catalogos`                       | `healthRegime`                 |
| `codigo_eps`                     | No   | Codigo de EPS activa, tratado como texto            | resolucion de `epsId`          |
| `vive_con_alguien`               | Si   | `Si`, `No`                                          | `livesWithSomeone`             |
| `acompanante`                    | No   | Texto, maximo 160                                   | `companion`                    |
| `ingreso_economico`              | No   | Entero entre 0 y 999.999.999                        | `economicIncome`               |
| `beneficiario_programa_social`   | Si   | `Si`, `No`                                          | `socialProgramBeneficiary`     |

Reglas de formato de la plantilla:

1. documento, telefonos, SISBEN, codigos DIVIPOLA y codigo EPS se configuran como texto;
2. las columnas controladas usan validaciones de datos de Excel cuando sea posible;
3. la fila de encabezados queda congelada;
4. los campos obligatorios se distinguen visualmente, pero el color no es la unica indicacion;
5. la hoja de datos no incluye `id`, `tenant_id`, edad, nombres concatenados ni timestamps;
6. la edad se calcula desde `fecha_nacimiento`;
7. `names` y `surnames` se derivan de sus partes en persistencia;
8. las celdas con formulas no se aceptan como entrada de datos.

### 5.5 Normalizacion de valores

El parser convierte valores visibles a valores internos mediante mapas versionados y puros:

1. trim de texto y colapso de espacios donde corresponda;
2. celdas vacias opcionales a `null`;
3. correo a minusculas;
4. `CC`, `CE`, `Pasaporte`, `Otro` a enums internos;
5. `Femenino`, `Masculino`, `Otro` a enums internos;
6. `Urbana`, `Rural` a valores internos;
7. `Si`, `No` a booleanos;
8. tipos de sangre visibles a valores internos;
9. codigos preservados como texto, incluidos ceros iniciales;
10. fechas normalizadas sin usar la zona horaria del servidor.

Se pueden aceptar diferencias de mayusculas, minusculas y tildes en valores catalogados despues de normalizar. No se aceptan coincidencias parciales ni fuzzy matching.

## 6. Reglas de validacion

### 6.1 Validaciones del archivo

1. solicitud `multipart/form-data`;
2. exactamente un campo de archivo llamado `file`;
3. archivo no vacio;
4. nombre con extension `.xlsx`;
5. MIME compatible con Office Open XML;
6. maximo 10 MiB;
7. ZIP/Workbook legible por ExcelJS;
8. sin macros ni formatos `.xlsm`;
9. plantilla y version soportadas;
10. hoja `Adultos mayores` existente una sola vez;
11. encabezados exactos, no duplicados y en el orden de la version;
12. entre 1 y 1.000 filas de datos no vacias;
13. formulas rechazadas en cualquier celda de datos;
14. filas completamente vacias ignoradas;
15. columnas inesperadas con contenido rechazadas.

No se confia solo en extension o MIME. El parser debe intentar abrir la estructura real y traducir archivos corruptos a un error controlado.

### 6.2 Validaciones por fila

Cada fila se transforma primero a un input intermedio y luego se valida con schemas compartidos o schemas de importacion que compongan las reglas existentes de Adultos Mayores.

Validaciones minimas:

1. campos requeridos;
2. longitudes maximas existentes;
3. enum o catalogo valido;
4. numero de documento como texto no vacio;
5. fecha real en formato canonico y no futura;
6. correo valido;
7. departamento activo por codigo;
8. municipio activo por codigo y perteneciente al departamento indicado;
9. EPS activa por codigo cuando se proporciona;
10. ingreso economico entero, no negativo y dentro del limite;
11. coherencia entre `vive_con_alguien` y `acompanante` como advertencia, no como bloqueo;
12. una persona menor de 60 anos genera advertencia, no error, hasta que producto defina otra regla formal.

La importacion no debe inventar IDs ni nombres de ubicacion. El backend resuelve codigo a UUID y persiste tambien los nombres oficiales, manteniendo el comportamiento del alta individual.

### 6.3 Duplicados

La identidad de negocio sigue siendo:

```txt
(tenant_id, document_type, document_number)
```

Politica:

| Caso                                                 | Resultado                          |
| ---------------------------------------------------- | ---------------------------------- |
| Documento repetido dentro del mismo archivo          | Error en todas las filas afectadas |
| Documento existente en el tenant destino             | `existing`, se omite               |
| Documento existente solamente en otro tenant         | Se permite crear                   |
| Documento creado por otro proceso despues de validar | Se omite al confirmar              |

El indice unico existente en PostgreSQL permanece como ultima defensa frente a carreras.

### 6.4 Errores y advertencias

Cada problema tiene:

```txt
rowNumber
column
code
severity
message
receivedValue
```

`receivedValue` debe truncarse, sanearse y nunca incluir formulas ejecutables en respuestas o reportes.

Codigos sugeridos:

```txt
required
invalid_format
invalid_enum
max_length
future_date
unknown_department
unknown_municipality
municipality_department_mismatch
unknown_eps
inactive_eps
duplicate_in_file
already_exists
under_expected_age
formula_not_allowed
```

## 7. Estado e idempotencia del lote

### 7.1 Estados

| Estado                  | Significado                                                |
| ----------------------- | ---------------------------------------------------------- |
| `ready`                 | Validado sin errores bloqueantes; se puede confirmar       |
| `validated_with_errors` | Validado con errores; requiere cargar un archivo corregido |
| `committing`            | Confirmacion en curso                                      |
| `completed`             | Confirmado y finalizado                                    |
| `failed`                | Fallo controlado durante confirmacion                      |
| `expired`               | Supero su vigencia y ya no puede confirmarse               |

Transiciones permitidas:

```txt
validate -> ready -> committing -> completed
validate -> validated_with_errors
ready -> expired
validated_with_errors -> expired
committing -> failed
```

Un lote no se edita. Cargar un archivo corregido crea un nuevo lote.

### 7.2 Vigencia

1. Un lote `ready` expira 24 horas despues de su validacion.
2. Solo el mismo usuario que valido el lote puede confirmarlo.
3. Usuarios autorizados del mismo tenant pueden consultar el historial y descargar el reporte, pero no confirmar un lote ajeno.
4. SuperAdmin puede consultar lotes de cualquier tenant, pero solo confirmar los que creo.

### 7.3 Confirmacion idempotente

`POST confirm` debe ser idempotente:

1. bloquear la fila del lote dentro de la transaccion;
2. si esta `completed`, devolver el mismo resultado exitoso;
3. si esta `committing`, devolver conflicto controlado o esperar el resultado segun la estrategia del driver;
4. si esta expirado o tiene errores, rechazar;
5. revalidar tenant, permisos, catalogos y duplicados sensibles a concurrencia;
6. insertar solo filas aun inexistentes;
7. actualizar conteos y auditoria en la misma transaccion;
8. nunca crear dos veces por reintentos del cliente.

Si un catalogo usado se desactiva entre validacion y confirmacion, la confirmacion falla con `409` y exige validar un nuevo lote.

## 8. Modelo de datos

Se agregaran tablas mediante una migracion Drizzle versionada. No se modificara PostgreSQL manualmente.

### 8.1 `adulto_mayor_import_batches`

| Columna                | Regla                                           |
| ---------------------- | ----------------------------------------------- |
| `id`                   | UUID, PK                                        |
| `tenant_id`            | FK `tenants`, obligatorio, `onDelete: restrict` |
| `requested_by_user_id` | FK `users`, obligatorio, `onDelete: restrict`   |
| `original_filename`    | Nombre saneado, maximo 260                      |
| `file_checksum_sha256` | SHA-256 hexadecimal                             |
| `template_version`     | Entero positivo                                 |
| `status`               | Estado controlado del lote                      |
| `total_rows`           | Entero no negativo                              |
| `ready_rows`           | Entero no negativo                              |
| `invalid_rows`         | Entero no negativo                              |
| `warning_rows`         | Entero no negativo                              |
| `existing_rows`        | Entero no negativo                              |
| `created_rows`         | Entero no negativo                              |
| `expires_at`           | Timestamp obligatorio                           |
| `confirmed_at`         | Timestamp nullable                              |
| `failure_code`         | Codigo controlado nullable; nunca stack trace   |
| `created_at`           | Timestamp obligatorio                           |
| `updated_at`           | Timestamp obligatorio                           |

Indices:

1. `(tenant_id, created_at)`;
2. `(requested_by_user_id, created_at)`;
3. `(status, expires_at)` para limpieza;
4. `file_checksum_sha256` indexado para diagnostico e idempotencia operacional.

### 8.2 `adulto_mayor_import_rows`

| Columna              | Regla                                       |
| -------------------- | ------------------------------------------- |
| `id`                 | UUID, PK                                    |
| `import_batch_id`    | FK al lote, `onDelete: cascade`             |
| `row_number`         | Numero original en Excel                    |
| `status`             | `ready`, `invalid`, `existing`              |
| `normalized_payload` | JSONB nullable, validado antes de persistir |
| `issues`             | JSONB de errores/advertencias controlados   |
| `existing_adulto_id` | FK nullable al adulto ya existente          |
| `created_adulto_id`  | FK nullable al adulto creado al confirmar   |
| `created_at`         | Timestamp obligatorio                       |

Restricciones e indices:

1. unique `(import_batch_id, row_number)`;
2. indice por `import_batch_id` y `status`;
3. checks de coherencia para conteos y estados cuando Drizzle/PostgreSQL lo permitan;
4. payload validado por schema antes de llegar al repositorio.

### 8.3 Retencion

El Excel original no se guarda en disco ni en PostgreSQL.

1. El buffer vive solo durante la solicitud de validacion.
2. Los payloads y errores temporales expiran a los 7 dias.
3. Al completar un lote se conserva la relacion minima lote/fila/adulto creado y se elimina el payload sensible cuando ya no sea necesario.
4. Lotes con errores conservan el reporte durante 7 dias y luego eliminan sus filas temporales.
5. El lote resumido y el `audit_log` se conservan como trazabilidad.
6. La implementacion incluira un comando de limpieza idempotente ejecutable diariamente en VPS; la politica no dependera solo de limpieza manual.

## 9. Contratos compartidos

`packages/contracts/src/adultos-mayores.ts` incorporara schemas y tipos para:

1. query de validacion con tenant opcional segun rol;
2. estado del lote;
3. severidad y codigo de issue;
4. resumen de validacion;
5. detalle del lote;
6. respuesta de confirmacion;
7. item de historial si se incluye listado;
8. errores API controlados mediante la convencion existente.

Los contratos representan datos JSON. El archivo multipart y los buffers permanecen como tipos internos de API.

Ejemplo conceptual de respuesta de validacion:

```json
{
  "importId": "uuid",
  "status": "ready",
  "tenant": {
    "id": "uuid",
    "name": "Centro de Vida Demo"
  },
  "summary": {
    "totalRows": 120,
    "readyRows": 112,
    "invalidRows": 0,
    "warningRows": 2,
    "existingRows": 8
  },
  "issues": [],
  "canConfirm": true,
  "expiresAt": "2026-08-11T15:00:00.000Z"
}
```

`canConfirm` se deriva en backend del estado y no reemplaza la autorizacion al confirmar.

## 10. API

Todos los endpoints usan `SessionGuard`, `RolesGuard` y `@RequireRoles("super_admin", "admin")`. La autorizacion se repite en el caso de uso para proteger invocaciones internas y pruebas.

| Metodo | Ruta                                                 | Funcion                                 |
| ------ | ---------------------------------------------------- | --------------------------------------- |
| `GET`  | `/api/adultos-mayores/imports/template`              | Descargar plantilla version vigente     |
| `POST` | `/api/adultos-mayores/imports/validate`              | Validar multipart y crear lote          |
| `GET`  | `/api/adultos-mayores/imports/:importId`             | Consultar lote dentro del scope         |
| `POST` | `/api/adultos-mayores/imports/:importId/confirm`     | Confirmar lote listo                    |
| `GET`  | `/api/adultos-mayores/imports/:importId/errors.xlsx` | Descargar reporte completo de problemas |

### 10.1 Descargar plantilla

Respuesta:

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="plantilla-importacion-adultos-mayores-v1.xlsx"
Cache-Control: private, no-store
```

El nombre del header se construye desde una constante segura, no desde input del usuario.

### 10.2 Validar

```http
POST /api/adultos-mayores/imports/validate
POST /api/adultos-mayores/imports/validate?tenantId=<uuid>  # solo SuperAdmin
Content-Type: multipart/form-data
```

Campos multipart:

```txt
file: exactamente un archivo
```

El tenant viaja como query param solo para SuperAdmin, no como campo del Excel ni campo multipart.

Respuesta exitosa: `201` con el detalle del lote, incluso si contiene errores por fila. Errores estructurales que impiden interpretar el workbook responden `400` y no crean un lote utilizable.

### 10.3 Confirmar

No recibe body ni tenant. El tenant se obtiene del lote y se vuelve a autorizar contra el actor.

Respuesta:

```json
{
  "importId": "uuid",
  "status": "completed",
  "createdRows": 112,
  "existingRows": 8,
  "completedAt": "2026-08-10T15:05:00.000Z"
}
```

### 10.4 Codigos HTTP

| Codigo | Uso                                                                 |
| ------ | ------------------------------------------------------------------- |
| `200`  | plantilla, consulta, reporte o confirmacion idempotente             |
| `201`  | lote de validacion creado                                           |
| `400`  | request, tenant requerido, archivo o plantilla estructural invalida |
| `401`  | sesion ausente                                                      |
| `403`  | rol no permitido, Admin sin tenant o intento cross-tenant           |
| `404`  | tenant o lote no visible                                            |
| `409`  | lote no confirmable, expirado, en proceso o invalidado por cambios  |
| `413`  | archivo superior al limite                                          |
| `422`  | reservado; los errores por fila viajan normalmente en el lote `201` |

Para evitar enumeracion cross-tenant, consultar un lote de otro tenant responde `404`.

## 11. Arquitectura backend

### 11.1 Componentes

Dentro del modulo existente se agregaran responsabilidades pequenas:

```txt
adultos-mayores/
  application/
    adultos-mayores-import.service.ts
    adultos-mayores-import-template.service.ts
  domain/
    adulto-mayor-import.policy.ts
    adulto-mayor-import.types.ts
    adultos-mayores-import.repository.ts
    adultos-mayores-import-parser.ts
    adultos-mayores-import-validator.ts
  infrastructure/
    drizzle-adultos-mayores-import.repository.ts
  presentation/
    adultos-mayores-import.controller.ts
```

Los nombres finales pueden ajustarse a las convenciones exactas del modulo, pero las responsabilidades no deben fusionarse en un unico servicio gigante.

### 11.2 Responsabilidades

`AdultosMayoresImportController`:

1. recibe HTTP;
2. valida params/query con contratos;
3. extrae un unico multipart de forma segura;
4. delega casos de uso;
5. serializa JSON o archivos.

No contiene reglas de tenant, Excel, duplicados ni SQL.

`AdultosMayoresImportService`:

1. autoriza rol y resuelve tenant;
2. coordina parser, validador y repositorio;
3. crea el lote;
4. confirma de forma idempotente;
5. traduce conflictos conocidos a errores de negocio.

No implementa detalles de celdas ni construye queries Drizzle.

`AdultosMayoresImportParser`:

1. recibe un `Buffer` y version;
2. verifica estructura del workbook;
3. entrega filas intermedias con numero de fila y valores primitivos;
4. es puro respecto a base de datos, sesion y HTTP;
5. expone errores estructurales tipados.

`AdultosMayoresImportValidator`:

1. normaliza valores por version;
2. aplica schemas;
3. resuelve catalogos recibidos como mapas;
4. detecta duplicados internos;
5. produce payloads validos e issues estables;
6. no persiste.

`AdultosMayoresImportRepository`:

1. carga catalogos por codigo de forma masiva;
2. consulta documentos existentes por tenant en bloques;
3. crea lote y staging;
4. consulta lotes con scope;
5. bloquea y confirma el lote;
6. inserta adultos en bloques;
7. registra auditoria en la misma transaccion;
8. limpia staging expirado.

### 11.3 Reutilizacion correcta

Se reutilizan o extraen como funciones puras:

1. schemas de comandos de Adultos Mayores;
2. mapas canonicos de enums y catalogos;
3. construccion de `names` y `surnames`;
4. validacion de ubicacion y EPS a traves de contratos/repositorios apropiados;
5. mensajes de conflicto consistentes.

No se debe invocar `createAdultoMayor()` una vez por fila. Ese enfoque produciria N transacciones, N auditorias, N consultas de ubicacion/EPS y comportamiento parcial dificil de revertir.

### 11.4 Acceso a datos eficiente

1. Cargar departamentos, municipios y EPS necesarios en consultas masivas.
2. Construir `Map` por codigo para validacion O(1) en memoria.
3. Consultar documentos existentes por tenant en lotes, no uno por uno.
4. Insertar en bloques sugeridos de 250 registros dentro de una transaccion.
5. No hacer joins o queries desde el loop de filas.
6. Mantener el indice unico actual como defensa de carrera.

### 11.5 Auditoria

Acciones sugeridas:

```txt
adultos-mayores.import.validated
adultos-mayores.import.completed
adultos-mayores.import.failed
```

La auditoria de finalizacion incluye:

1. `importId`;
2. tenant;
3. checksum;
4. version de plantilla;
5. filas totales, creadas, existentes e invalidas;
6. usuario actor;
7. duracion si esta disponible.

No incluye el archivo, nombres completos, documentos, correos ni el payload completo.

La relacion lote/fila/adulto creado permite trazabilidad individual sin inflar `audit_logs` con mil entradas.

## 12. Arquitectura frontend

### 12.1 Rutas y permisos

Ruta funcional:

```txt
/adultos-mayores/importar
```

Reglas:

1. agregar un permiso web especifico `canImportAdultosMayores`;
2. permitir solo `super_admin` y `admin`;
3. no reutilizar `canManageAdultosMayores`, porque incluye otros roles operativos;
4. agregar guard de ruta en `app.tsx`;
5. agregar acceso en inicio/navegacion filtrado por roles;
6. agregar un acceso contextual desde el listado de Adultos Mayores para los mismos roles.

Si el acceso se integra como shortcut de inicio, el ID de modulo y sus contratos se actualizan de manera consistente. El indicador sugerido es `Importaciones completadas`; el backend solo lo calcula para roles autorizados.

### 12.2 Estructura sugerida

```txt
features/adultos-mayores/
  api/
    adultos-mayores-import-api.ts
  components/
    adultos-mayores-import-target.tsx
    adultos-mayores-import-upload.tsx
    adultos-mayores-import-summary.tsx
    adultos-mayores-import-issues-table.tsx
    adultos-mayores-import-confirmation.tsx
  lib/
    adultos-mayores-import-permissions.ts
    adultos-mayores-import-paths.ts
  model/
    adultos-mayores-import-queries.ts
  pages/
    adultos-mayores-import-page.tsx
```

La pagina compone el flujo. Cada componente recibe datos y callbacks tipados; no llama la API directamente.

### 12.3 Estado y React Query

1. React Query administra lote, validacion, confirmacion y descarga.
2. El archivo seleccionado permanece como estado local de la pagina y no entra al cache.
3. No se introduce Zustand para este flujo.
4. Las keys incluyen `importId` y, donde corresponda, tenant.
5. La confirmacion exitosa invalida:
   - listado de Adultos Mayores;
   - detalle del lote;
   - historial/resumen de importaciones;
   - dashboard de inicio.
6. No se recarga la pagina completa.
7. No se guarda el Excel ni el lote en `localStorage`.

### 12.4 Accesibilidad y feedback

1. El selector de archivo tiene label visible.
2. La zona drag-and-drop tambien funciona con teclado y boton nativo.
3. Errores generales usan `role="alert"`.
4. Progreso y resultado usan regiones anunciables sin repetir mensajes.
5. La tabla de issues tiene encabezados semanticos y texto, no solo color.
6. El foco se mueve al resumen cuando termina la validacion.
7. La confirmacion devuelve el foco a un resultado final estable.
8. Botones pendientes exponen estado y permanecen deshabilitados contra doble envio.

## 13. Seguridad

### 13.1 Aislamiento multi-tenant

La defensa minima debe existir en varias capas:

1. guard de sesion;
2. guard de roles;
3. policy de aplicacion;
4. resolucion server-side del tenant;
5. queries de repositorio obligatoriamente scoped;
6. FK y unique compuesto por tenant;
7. pruebas de manipulacion y cross-tenant.

La visibilidad frontend nunca se considera un control de seguridad.

### 13.2 RLS

El proyecto declara PostgreSQL Row Level Security como principio, pero la implementacion debe verificar que existan politicas reales y contexto de tenant en las conexiones antes de afirmar que la importacion esta protegida por RLS.

Este feature no debe implementar una pseudo-RLS aislada solo para sus tablas. Si RLS aun no esta operativa, se abre un workstream de hardening transversal para `adultos_mayores`, staging y demas tablas multi-tenant. La salida a produccion requiere documentar cual de estas dos condiciones se cumple:

1. RLS real, probada y activa; o
2. aislamiento de aplicacion probado, con la deuda de RLS registrada y aprobada explicitamente.

### 13.3 Archivos y contenido no confiable

1. No persistir el archivo original.
2. No exponer rutas internas.
3. Sanear el nombre original antes de metadata o headers.
4. Rechazar formulas en la hoja de datos.
5. Escapar valores que comiencen por `=`, `+`, `-` o `@` al generar el reporte Excel.
6. Limitar peso, filas, hojas y celdas procesadas para evitar consumo excesivo.
7. No registrar payloads ni documentos en logs de aplicacion.
8. No devolver stack traces ni errores internos de ExcelJS/ZIP.

## 14. Manejo de errores

Los errores se dividen en:

1. estructurales: impiden leer la plantilla y responden HTTP controlado;
2. de fila: se guardan en el lote y aparecen en el reporte;
3. de autorizacion: no crean lote;
4. de concurrencia: se traducen a `409` o a omision determinista;
5. inesperados: se registran con correlation/request ID sin PII y responden mensaje generico.

Mensajes funcionales sugeridos:

1. `Solo Admin y SuperAdmin pueden importar adultos mayores.`
2. `Tu usuario no tiene un centro asociado.`
3. `Selecciona el centro donde se importaran los adultos mayores.`
4. `El centro seleccionado no existe o no se encuentra activo.`
5. `El archivo debe ser una plantilla Excel .xlsx de CuidarTe.`
6. `La plantilla no corresponde a una version soportada.`
7. `El archivo supera el limite de 1.000 filas.`
8. `Corrige los errores del archivo antes de confirmar la importacion.`
9. `El lote expiro. Valida nuevamente el archivo.`
10. `Los catalogos cambiaron desde la validacion. Valida nuevamente el archivo.`

## 15. Reglas contra codigo spaghetti

Estas reglas son obligatorias para aprobar la implementacion:

1. Ningun controller parsea celdas ni ejecuta queries.
2. Ningun componente React construye reglas de negocio de tenant.
3. Ningun repositorio conoce HTTP, Fastify o contratos visuales de Excel.
4. El parser no conoce sesion, roles ni base de datos.
5. El validador no escribe ni abre transacciones.
6. El servicio de importacion no contiene SQL ni detalles de estilos Excel.
7. No se llama el alta individual en un loop.
8. No se hacen consultas dentro del loop de filas.
9. No se duplican enums, catalogos o limites entre API y web sin una fuente compartida.
10. No se usa `any`; los bordes de ExcelJS se convierten a tipos intermedios validados.
11. No se crea un componente de pagina monolitico con selector, upload, tabla y confirmacion mezclados.
12. No se persisten filas antes de terminar la validacion completa.
13. No se hacen importaciones parciales invisibles.
14. No se captura `Error` para devolver siempre el mismo `400`; los errores esperados tienen tipos/codigos propios.
15. No se modifica el tenant de un adulto existente mediante importacion.

## 16. Plan de implementacion

### Fase 1 - Contratos y plantilla

1. definir contratos de importacion en `packages/contracts`;
2. definir mapas canonicos de valores visibles;
3. implementar generador de plantilla versionada;
4. probar workbook, metadata, encabezados y catalogos.

Salida: la plantilla se descarga y su contrato queda congelado como version 1.

### Fase 2 - Modelo persistente y repositorio

1. agregar tablas de lote y filas staging;
2. generar migracion Drizzle;
3. agregar repositorio y queries scoped;
4. implementar limpieza de staging expirado;
5. probar restricciones, indices y aislamiento.

Salida: se pueden crear y consultar lotes sin insertar adultos.

### Fase 3 - Parser y validador

1. implementar parser estructural puro;
2. implementar normalizadores versionados;
3. resolver ubicaciones y EPS por codigo;
4. detectar duplicados internos y existentes;
5. generar issues y resumen;
6. generar reporte completo de errores.

Salida: un archivo real produce un lote determinista y reproducible.

### Fase 4 - Confirmacion transaccional

1. implementar policy exclusiva Admin/SuperAdmin;
2. implementar lock e idempotencia del lote;
3. revalidar condiciones sensibles;
4. insertar en bloques;
5. relacionar filas con adultos creados;
6. registrar auditoria y conteos;
7. traducir unique violations y concurrencia.

Salida: el lote listo se confirma una sola vez y sin escrituras parciales.

### Fase 5 - Frontend

1. rutas, permisos y acceso de modulo;
2. selector de tenant para SuperAdmin;
3. descarga de plantilla;
4. selector de archivo;
5. resumen y tabla de issues;
6. descarga del reporte;
7. confirmacion y resultado;
8. invalidaciones de cache.

Salida: flujo completo operable sin recarga de pagina.

### Fase 6 - QA y hardening

1. pruebas de permisos y cross-tenant;
2. pruebas de archivos adversos;
3. pruebas de concurrencia e idempotencia;
4. pruebas de rendimiento con 1.000 filas;
5. verificacion de memoria y tiempo de respuesta;
6. verificacion/decision formal de RLS;
7. verificacion de limpieza de staging en VPS.

Salida: criterios de aceptacion completos y evidencia de pruebas.

## 17. Pruebas obligatorias

### 17.1 Parser y plantilla

1. genera template key y version correctas;
2. conserva codigos como texto;
3. acepta una plantilla valida;
4. rechaza otra version;
5. rechaza hoja faltante;
6. rechaza encabezados faltantes, repetidos, alterados o fuera de orden;
7. rechaza formulas;
8. rechaza `.xls`, `.xlsm`, ZIP corrupto y archivo vacio;
9. rechaza mas de 1.000 filas;
10. ignora filas completamente vacias sin cambiar numeros de fila reportados.

### 17.2 Validacion de dominio

1. mapea todos los enums visibles;
2. conserva ceros iniciales;
3. valida fechas sin desfase de timezone;
4. resuelve departamento y municipio por DIVIPOLA;
5. rechaza municipio de otro departamento;
6. resuelve EPS activa por codigo;
7. rechaza EPS inexistente o inactiva;
8. aplica campos opcionales y defaults;
9. detecta duplicados internos;
10. marca existentes solo dentro del tenant destino;
11. genera warning para edad menor de 60 sin bloquear.

### 17.3 API y autorizacion

Matriz minima:

| Rol              | Plantilla | Validar | Confirmar |
| ---------------- | --------- | ------- | --------- |
| `super_admin`    | Si        | Si      | Si        |
| `admin`          | Si        | Si      | Si        |
| `auditor`        | No        | No      | No        |
| roles operativos | No        | No      | No        |

Casos adicionales:

1. Admin usa siempre el tenant de su sesion;
2. Admin que envia tenant ajeno recibe `403`;
3. SuperAdmin requiere tenant y solo puede seleccionar uno activo;
4. consultar lote de otro tenant responde `404`;
5. solo el creador confirma el lote;
6. confirmar lote con errores o expirado falla;
7. confirmar dos veces devuelve el mismo resultado;
8. dos confirmaciones concurrentes crean una sola vez;
9. cambio de catalogo invalida la confirmacion;
10. archivo grande responde `413`.

### 17.4 Persistencia

1. validar no crea adultos;
2. confirmar crea todas las filas nuevas en una transaccion;
3. un fallo en cualquier insert hace rollback completo;
4. carreras de unique se traducen sin duplicar;
5. existing rows no se actualizan;
6. `tenant_id` de todos los nuevos registros coincide con el lote;
7. auditoria y conteos coinciden con la transaccion;
8. staging expira y se limpia sin borrar adultos creados;
9. el archivo original no queda en filesystem.

### 17.5 Web

1. solo Admin/SuperAdmin ven el acceso;
2. los demas roles son redirigidos fuera de la ruta;
3. Admin ve centro de solo lectura;
4. SuperAdmin debe seleccionar centro;
5. cambiar centro limpia archivo y resultado;
6. se descarga plantilla con sesion;
7. se valida un archivo y se muestra resumen;
8. errores bloquean confirmacion;
9. reporte de errores se descarga;
10. doble clic no duplica mutaciones;
11. confirmacion exitosa refresca Adultos Mayores sin recargar;
12. navegacion y flujo funcionan en desktop y movil;
13. estados y errores son anunciables por tecnologias de asistencia.

### 17.6 Comandos de verificacion

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api typecheck
pnpm --filter @cuidarte/api test
pnpm --filter @cuidarte/web typecheck
pnpm --filter @cuidarte/web test
pnpm build
```

Si se agregan pruebas E2E dedicadas, deben cubrir al menos Admin, SuperAdmin y rechazo cross-tenant contra una API real.

## 18. Criterios de aceptacion

1. Solo `admin` y `super_admin` pueden abrir y consumir la importacion.
2. El Excel no contiene ni controla `tenant_id`.
3. Admin importa exclusivamente en el tenant de su sesion.
4. SuperAdmin selecciona un tenant activo antes de validar.
5. La plantilla es generada por backend, versionada y descargable.
6. Solo se acepta `.xlsx`, hasta 10 MiB y 1.000 filas.
7. Validar no escribe en `adultos_mayores`.
8. Todos los errores identifican fila, columna, codigo y mensaje.
9. Un lote con errores no se puede confirmar.
10. Los documentos existentes se omiten y no se actualizan.
11. La confirmacion es atomica e idempotente.
12. Todos los registros creados reciben el tenant resuelto por backend.
13. Reintentos y concurrencia no crean duplicados.
14. El resultado queda auditado sin almacenar PII en `audit_logs`.
15. El archivo original no se conserva.
16. La UI actualiza listados y resumen sin recarga completa.
17. El staging sensible cumple la retencion definida.
18. Las pruebas de permisos, tenant, parser, transaccion y web pasan.
19. La situacion real de RLS queda verificada y documentada antes de produccion.
20. La implementacion respeta las separaciones de responsabilidad de este spec.

## 19. Riesgos y mitigaciones

1. **Cruce accidental de tenant.**
   Mitigacion: tenant server-side, policy, scope en repositorio, FK/unique y pruebas de manipulacion.

2. **Sobrescritura de datos existentes.**
   Mitigacion: politica `create-only`; existentes se omiten.

3. **Importacion parcial.**
   Mitigacion: validacion previa y confirmacion en una sola transaccion.

4. **N+1 y tiempos altos.**
   Mitigacion: catalogos y duplicados por lotes, mapas en memoria e inserts por bloques.

5. **Plantillas antiguas interpretadas incorrectamente.**
   Mitigacion: metadata y version obligatorias.

6. **Formula injection en reportes.**
   Mitigacion: rechazar formulas de entrada y escapar prefijos peligrosos al exportar.

7. **Reintentos que duplican datos.**
   Mitigacion: lock de lote, confirmacion idempotente e indice unico.

8. **Staging con PII indefinida.**
   Mitigacion: no guardar archivo, expiracion, limpieza diaria y reduccion del payload al completar.

9. **Reglas divergentes entre alta manual e importacion.**
   Mitigacion: componer schemas y extraer normalizadores puros compartidos; tests de paridad.

10. **Archivo grande agota memoria.**
    Mitigacion: limite temprano de 10 MiB/1.000 filas y medicion con archivo maximo.

## 20. Fuera de alcance

1. Actualizacion masiva de adultos existentes.
2. Eliminacion masiva.
3. Importacion CSV, `.xls`, `.xlsm` o Google Sheets.
4. Elegir tenant por fila.
5. Importar varios tenants en un solo archivo.
6. Procesamiento con colas o workers.
7. Edicion inline de errores desde la aplicacion.
8. Guardar o descargar nuevamente el Excel original.
9. Reglas nuevas de negocio sobre edad minima sin aprobacion de producto.
10. Despliegue, push o merge automatico.

## 21. Entregables

1. Spec aprobado y plantilla version 1 congelada.
2. Contratos compartidos de importacion.
3. Migracion Drizzle de lotes y staging.
4. Generador y parser Excel probados.
5. Validacion masiva por tenant.
6. Confirmacion atomica e idempotente.
7. Auditoria y limpieza de staging.
8. Endpoints documentados en Swagger.
9. Modulo web restringido con flujo completo.
10. Reporte Excel de errores.
11. Suite de pruebas y evidencia de verificacion.
12. Decision documentada sobre RLS para produccion.
