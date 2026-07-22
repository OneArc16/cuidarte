# SPEC: Logo del Centro de Vida por Tenant en Formatos de Alimentacion

- Estado: proposed
- Fecha: 2026-07-22
- Nombre: logo del centro de vida por tenant
- Modulos: `backoffice`, `tenant-branding`, `registro-alimentacion`
- Fase: administracion de logo versionado e inclusion en nuevas emisiones PDF
- Complementa:
  - `docs/specs/alimentacion-formato-entrega-individual-v2.spec.md`
  - `docs/specs/alimentacion-firma-director-historica.spec.md`

## 1. Objetivo

Permitir que cada tenant configure el logo de su Centro de Vida y que dicho logo aparezca en las nuevas emisiones del `Formato de Entrega de Alimentos y Auxilio de Transporte`, garantizando:

1. aislamiento multi-tenant;
2. trazabilidad de quien carga o reemplaza el logo;
3. preservacion de los PDF historicos;
4. validacion segura de imagenes;
5. responsabilidades claras entre BackOffice, branding y Alimentacion;
6. una base reutilizable para otros documentos sin ampliar el alcance de esta fase.

## 2. Contexto tecnico actual

1. Los tenants se administran desde BackOffice y sus datos principales viven en `tenants`.
2. BackOffice opera actualmente con payloads JSON para crear y actualizar tenant y propietario.
3. La API ya soporta `multipart/form-data` y cuenta con patrones de almacenamiento de archivos para firmas y soportes.
4. El PDF de Alimentacion usa actualmente un logo institucional global leido desde el filesystem.
5. La primera emision del formato por adulto mayor y mes se guarda como PDF y las descargas posteriores reutilizan ese archivo historico.
6. Las firmas del director ya aplican versionado y snapshot en la emision; el logo debe respetar el mismo principio de inmutabilidad documental.

## 3. Decisiones de arquitectura

### 3.1 Branding como modulo independiente

Se creara el feature module `tenant-branding` en la API.

No se implementara la lectura o procesamiento del logo dentro de:

- `BackofficeService`;
- `AlimentacionService`;
- la plantilla HTML del PDF;
- controladores con acceso directo a base de datos o filesystem.

El modulo sera propietario de:

1. versiones de logo;
2. asignacion del logo activo de cada tenant;
3. validacion y normalizacion de imagenes;
4. almacenamiento y lectura del archivo;
5. autorizacion de los comandos de administracion;
6. auditoria asociada al branding.

BackOffice sera un consumidor administrativo del modulo. Alimentacion sera un consumidor de solo lectura.

### 3.2 Versionado obligatorio

Cada carga crea una nueva version. Un reemplazo no sobrescribe ni elimina el archivo anterior.

Motivos:

1. permitir auditoria;
2. evitar que un cambio visual altere documentos historicos;
3. identificar exactamente el logo usado por cada emision;
4. mantener consistencia con el modelo existente de firmas del director.

### 3.3 Emisiones historicas inmutables

1. Si ya existe una emision para el adulto mayor y mes solicitado, se devuelve el PDF guardado sin consultar el logo activo actual.
2. Si no existe emision, se usa una version concreta del logo activo y esa misma version se registra en la nueva emision.
3. Reemplazar o retirar el logo no regenera PDF existentes.

### 3.4 Administracion separada del formulario del tenant

La imagen no se incorporara al `POST` o `PATCH` JSON utilizado para los datos generales del tenant.

Se usara un endpoint multipart independiente porque:

1. la base de datos y el almacenamiento de archivos no comparten una transaccion atomica;
2. los errores de carga no deben deshacer cambios de nombre, propietario o contacto;
3. reemplazar el logo tiene permisos, validaciones y auditoria propias;
4. evita convertir el formulario completo del tenant a multipart.

## 4. Alcance funcional

### 4.1 Incluido

1. Cargar el primer logo de un tenant existente.
2. Consultar metadata y vista previa del logo activo.
3. Reemplazar el logo creando una nueva version.
4. Retirar la asignacion activa sin eliminar versiones historicas.
5. Mostrar el estado de branding en el detalle del tenant.
6. Incluir el logo activo en nuevas emisiones PDF de Alimentacion.
7. Guardar la version del logo utilizada en la emision.
8. Bloquear una nueva emision si el tenant no tiene logo configurado.
9. Mantener disponibles las emisiones historicas aunque el logo sea reemplazado o retirado.

### 4.2 Fuera de alcance

1. Aplicar el logo a actas de Actividades Grupales u otros documentos.
2. Permitir que roles del tenant administren su propio branding.
3. Editor de recorte, filtros o eliminacion de fondo en navegador.
4. Eliminacion fisica de versiones historicas.
5. Regeneracion masiva de formatos ya emitidos.
6. Personalizacion de colores, tipografias o textos por tenant.
7. Migracion inmediata a un proveedor concreto de object storage.

## 5. Reglas de negocio

### 5.1 Propiedad y permisos

1. Solo `super_admin` puede cargar, reemplazar o retirar el logo en esta fase.
2. El logo siempre se asocia al `tenantId` de la URL validado por la API.
3. Ningun identificador de tenant enviado dentro del multipart sera aceptado.
4. Alimentacion solo puede resolver el logo despues de validar el scope del adulto mayor y obtener el `tenantId` desde datos confiables del servidor.

### 5.2 Logo requerido para nuevas emisiones

1. Un tenant puede existir sin logo para permitir una migracion progresiva.
2. Una nueva emision PDF requiere un logo activo.
3. Si no existe logo activo, la API responde `409 Conflict` con un mensaje funcional:

   `El centro no tiene un logo configurado. Solicita al administrador cargarlo antes de exportar el formato.`

4. La descarga de una emision historica existente no se bloquea por ausencia del logo activo.

### 5.3 Reemplazo y retiro

1. Reemplazar crea una nueva fila de version y actualiza la asignacion activa.
2. La version anterior permanece disponible para auditoria.
3. Retirar el logo deja `activeLogoVersionId` en `null`.
4. Retirar el logo requiere confirmacion en web.
5. No se permite eliminar fisicamente una version referenciada por una emision.

### 5.4 Composicion visual del encabezado

1. Se conserva el logo institucional actualmente utilizado por el formato.
2. Se agrega el logo dinamico del Centro de Vida.
3. Distribucion propuesta:
   - logo institucional a la izquierda;
   - titulo centrado;
   - logo del tenant a la derecha.
4. Ambos logos deben conservar proporcion con `object-fit: contain`.
5. Ningun logo debe superar la altura reservada del encabezado ni desplazar las tablas.
6. El texto alternativo del logo dinamico sera `Logo de <tenantName>`.

Si negocio determina que el logo del tenant debe reemplazar al institucional, solo cambiara la composicion de la plantilla; el modelo, API y versionado permanecen iguales.

## 6. Validacion y normalizacion de imagen

### 6.1 Formatos aceptados

- `image/png`
- `image/jpeg`
- `image/webp`

No se aceptan SVG, GIF, BMP, PDF ni archivos animados.

### 6.2 Limites

1. Tamano maximo de entrada: `2 MB`.
2. Archivo no vacio.
3. Dimensiones minimas: `32 x 32 px`.
4. Dimensiones maximas de entrada: `4000 x 4000 px`.
5. Una sola imagen/frame por archivo.

### 6.3 Verificacion real

No es suficiente confiar en extension o `Content-Type` enviado por el cliente.

El backend debe:

1. comprobar extension y MIME declarado;
2. decodificar la imagen con una libreria especializada;
3. validar formato, dimensiones y numero de paginas/frames;
4. corregir orientacion EXIF;
5. eliminar metadata;
6. redimensionar dentro de un limite de `1200 x 600 px` sin deformar ni ampliar imagenes pequenas;
7. normalizar el resultado a PNG para render consistente y soporte de transparencia;
8. calcular SHA-256 sobre el archivo normalizado.

Se recomienda `sharp` como dependencia de `@cuidarte/api`. El procesador debe quedar encapsulado detras de `TenantLogoImageProcessor` para que controladores y casos de uso no dependan directamente de la libreria.

## 7. Modelo de datos

### 7.1 Tabla `tenant_logo_versions`

Responsabilidad: conservar archivos de logo inmutables.

Campos:

- `id: uuid` PK
- `tenant_id: uuid` FK `tenants.id`, `onDelete: restrict`
- `original_name: varchar(260)`
- `mime_type: varchar(100)`; el valor persistido para archivos normalizados sera `image/png`
- `size_bytes: integer`
- `checksum: varchar(64)`
- `relative_path: varchar(500)`
- `uploaded_by_user_id: uuid` FK `users.id`, `onDelete: restrict`
- `created_at: timestamptz`

Indices y restricciones:

1. indice por `tenant_id, created_at`;
2. indice por `uploaded_by_user_id`;
3. opcionalmente unique por `tenant_id, checksum` para evitar versiones binarias duplicadas;
4. `size_bytes > 0`.

### 7.2 Tabla `tenant_branding`

Responsabilidad: apuntar al logo actualmente activo.

Campos:

- `tenant_id: uuid` PK y FK `tenants.id`, `onDelete: cascade`
- `active_logo_version_id: uuid | null` FK `tenant_logo_versions.id`, `onDelete: restrict`
- `updated_by_user_id: uuid` FK `users.id`, `onDelete: restrict`
- `created_at: timestamptz`
- `updated_at: timestamptz`

Reglas:

1. una sola configuracion de branding por tenant;
2. la version activa debe pertenecer al mismo tenant;
3. la aplicacion valida pertenencia y la operacion se ejecuta en transaccion;
4. el logo activo se obtiene mediante `tenant_branding`, no mediante `MAX(created_at)`.

### 7.3 Cambio en `alimentacion_formato_emissions`

Agregar:

- `tenant_logo_version_id_snapshot: uuid | null`

La columna inicia nullable para preservar emisiones existentes. Toda nueva emision posterior al despliegue debe guardarla como no nula a nivel de aplicacion.

La FK usa `onDelete: restrict` para impedir eliminar la version empleada en un documento.

### 7.4 Migracion

1. Crear tablas e indices.
2. Agregar la columna nullable a emisiones.
3. No intentar atribuir el logo global antiguo a emisiones existentes.
4. Las emisiones previas conservaran snapshot `null` y seguiran sirviendo el PDF almacenado.
5. No hacer `NOT NULL` sobre el snapshot mientras existan emisiones legacy.

## 8. Contratos compartidos

Agregar en `packages/contracts` contratos de respuesta; el binario multipart no se modela como JSON Zod.

### 8.1 Metadata publica administrativa

```ts
tenantLogoMetadataSchema = z.object({
  versionId: z.uuid(),
  originalName: z.string().min(1),
  mimeType: z.literal("image/png"),
  sizeBytes: z.number().int().positive(),
  checksum: z.string().length(64),
  updatedAt: z.string().min(1),
});
```

El detalle administrativo del tenant incluira:

```ts
logo: tenantLogoMetadataSchema.nullable()
```

El contrato nunca expone `relativePath` ni ubicaciones internas del storage.

### 8.2 Respuestas

1. `uploadTenantLogoResponseSchema`: metadata de la nueva version activa.
2. `removeTenantLogoResponseSchema`: `{ success: true }`.
3. El listado de tenants puede exponer `hasLogo: boolean` para mostrar estado sin transportar metadata completa.

## 9. API propuesta

### 9.1 Cargar o reemplazar

`PUT /api/backoffice/tenants/:tenantId/logo`

- Auth: sesion requerida.
- Rol: `super_admin`.
- Content-Type: `multipart/form-data`.
- Campo permitido: `logo`, exactamente un archivo.
- Campos o archivos adicionales: `400 Bad Request`.
- Respuesta: `200 OK` con `uploadTenantLogoResponseSchema`.

Se usa `PUT` porque la operacion reemplaza la representacion activa del logo, aunque internamente cree una version inmutable.

### 9.2 Consultar archivo activo

`GET /api/backoffice/tenants/:tenantId/logo/file`

- Auth: sesion requerida.
- Rol: `super_admin`.
- Respuesta inline con `Content-Type: image/png`.
- `Content-Disposition` con nombre sanitizado.
- `Cache-Control: private, no-store` en esta fase para evitar mostrar una version anterior tras reemplazar.
- `404 Not Found` si no existe logo activo.

La web debe obtener el archivo con `fetchBlob` autenticado y crear un object URL, siguiendo el patron existente de vista previa de firmas.

### 9.3 Retirar asignacion activa

`DELETE /api/backoffice/tenants/:tenantId/logo`

- Auth: sesion requerida.
- Rol: `super_admin`.
- Respuesta: `200 OK`, `{ success: true }`.
- Idempotencia: retirar cuando ya no hay logo responde exitosamente.
- No elimina versiones ni archivos historicos.

## 10. Arquitectura de API y responsabilidades

Estructura recomendada:

```text
apps/api/src/modules/tenant-branding/
  application/
    tenant-branding.service.ts
    tenant-logo-image-processor.ts
  domain/
    tenant-branding.repository.ts
    tenant-logo-files.storage.ts
    tenant-branding.types.ts
  infrastructure/
    drizzle-tenant-branding.repository.ts
    local-tenant-logo-files.storage.ts
  presentation/
    tenant-branding.controller.ts
  tenant-branding.module.ts
```

### 10.1 `TenantBrandingController`

Responsable solo de:

1. parsear `tenantId`;
2. parsear multipart;
3. invocar el caso de uso;
4. configurar headers HTTP;
5. serializar respuestas.

No valida dimensiones, no escribe archivos y no ejecuta queries.

### 10.2 `TenantBrandingService`

Metodos esperados:

- `uploadLogo(tenantId, upload, actor)`
- `removeActiveLogo(tenantId, actor)`
- `getAdministrativeLogo(tenantId, actor)`
- `resolveActiveLogo(tenantId)`
- `readLogoVersionFile(version)`

Responsable de permisos, existencia del tenant, orquestacion, compensacion de errores y auditoria.

Los metodos de lectura interna usados por Alimentacion no reciben un `tenantId` proporcionado por navegador; reciben el tenant ya resuelto por el caso de uso de Alimentacion.

### 10.3 `TenantLogoImageProcessor`

Responsable exclusivamente de:

1. validar contenido;
2. decodificar;
3. normalizar;
4. devolver buffer PNG, dimensiones, tamano y checksum.

### 10.4 `TenantBrandingRepository`

Responsable de:

1. consultar tenant y branding;
2. crear version;
3. cambiar asignacion activa;
4. retirar asignacion;
5. persistir auditoria dentro de la transaccion correspondiente.

No lee ni escribe archivos.

### 10.5 `TenantLogoFilesStorage`

Contrato minimo:

- `saveFile(scope, file)`
- `readFile(relativePath, metadata)`
- `deleteFile(relativePath)` para compensacion de versiones no persistidas

La ruta local propuesta es:

```text
{tenantId}/branding/logos/{uuid}.png
```

La implementacion debe resolver rutas de forma segura y rechazar path traversal.

### 10.6 Dependencias permitidas

```text
BackOffice presentation ──> TenantBrandingService
Alimentacion export      ──> TenantBrandingService (lectura)
TenantBrandingService    ──> Repository + Storage + ImageProcessor
Repository               ──> Database
Storage                  ──> Filesystem/Object Storage
PDF template             ──> datos y data URLs ya resueltos
```

Dependencias prohibidas:

1. `AlimentacionService -> BackofficeService`;
2. `BackofficeService -> AlimentacionService`;
3. plantilla PDF leyendo base de datos o filesystem;
4. controller accediendo a Drizzle;
5. repository procesando imagenes;
6. web conociendo rutas internas de archivos.

## 11. Flujo de carga o reemplazo

1. Controller valida multipart y obtiene un buffer limitado.
2. Service valida rol y existencia del tenant.
3. ImageProcessor valida y normaliza la imagen.
4. Storage guarda el nuevo archivo inmutable.
5. Repository, dentro de una transaccion:
   - crea `tenant_logo_versions`;
   - hace upsert de `tenant_branding`;
   - registra `tenant.logo_uploaded` o `tenant.logo_replaced`.
6. Si la transaccion falla, Service elimina el archivo nuevo mediante compensacion best-effort.
7. Se devuelve metadata de la version activa.
8. No se elimina el archivo de la version anterior.

### 11.1 Concurrencia

1. La asignacion activa se actualiza en una unica transaccion.
2. La ultima transaccion confirmada determina el logo activo.
3. Cada version concurrente queda identificada y auditable.
4. No se reutilizan nombres de archivo del cliente como rutas fisicas.

## 12. Integracion con la emision PDF

### 12.1 Nueva emision

El flujo de `AlimentacionFormatoExportService` sera:

1. buscar una emision historica existente;
2. si existe, devolverla inmediatamente;
3. preparar y validar datos del formato y scope;
4. resolver en paralelo:
   - asignacion y version de firma del director;
   - version activa del logo del tenant;
5. si falta logo, responder `409` antes de lanzar Chromium;
6. leer en paralelo los archivos concretos de firma y logo;
7. construir data URLs desde buffers confiables;
8. renderizar y guardar el PDF;
9. crear la emision con `signatureVersionIdSnapshot` y `tenantLogoVersionIdSnapshot`;
10. si falla la persistencia de la emision, eliminar el PDF nuevo mediante compensacion;
11. registrar auditoria y devolver el archivo.

El logo debe resolverse una sola vez por ID de version. Si otro usuario reemplaza el logo durante la generacion, la emision conserva la version que ya habia sido resuelta.

### 12.2 Plantilla PDF

La funcion pura de plantilla recibira:

- `institutionalLogoDataUrl`;
- `tenantLogoDataUrl`;
- `tenantName` dentro de los datos del formato;
- el resto de datos ya existentes.

La plantilla:

1. no conoce IDs, rutas ni servicios;
2. no aplica reglas de permisos;
3. escapa textos y atributos dinamicos;
4. conserva tamanos fijos del encabezado para evitar cambios de paginacion;
5. usa `object-fit: contain` y dimensiones maximas para ambos logos.

### 12.3 Emisiones anteriores a esta funcionalidad

1. Conservan `tenantLogoVersionIdSnapshot = null`.
2. Continuan descargandose desde `pdfRelativePath`.
3. No se regeneran ni se marcan como invalidas.

## 13. Experiencia de usuario en BackOffice

### 13.1 Ubicacion

Agregar un panel `Identidad visual` en la pagina de detalle/edicion del tenant, separado de `Datos del centro` y `Usuario administrador`.

En la creacion:

1. primero se crea el tenant con el flujo JSON existente;
2. luego se navega al detalle;
3. el panel muestra `Logo pendiente` y permite cargarlo.

No se intentara coordinar silenciosamente dos mutaciones dentro del submit de creacion.

### 13.2 Estados del panel

1. Cargando metadata.
2. Sin logo:
   - estado `Logo pendiente`;
   - explicacion de que no se podran emitir nuevos formatos;
   - accion `Subir logo`.
3. Con logo:
   - vista previa;
   - nombre y fecha de actualizacion;
   - acciones `Reemplazar logo` y `Retirar logo`.
4. Cargando archivo:
   - boton deshabilitado;
   - indicador y texto `Subiendo...`.
5. Error:
   - mensaje junto al control;
   - causa y accion de recuperacion.
6. Exito:
   - actualizar cache de detalle y preview;
   - confirmacion accesible no intrusiva.

### 13.3 Reglas de interaccion

1. Input de archivo con label visible y `accept="image/png,image/jpeg,image/webp"`.
2. Ayuda persistente: formatos, peso maximo y recomendacion de fondo transparente.
3. Vista previa con ancho/alto o `aspect-ratio` reservados para evitar layout shift.
4. Imagen con alt descriptivo.
5. Revocar object URLs anteriores al reemplazar o desmontar el componente.
6. Botones con minimo 44 x 44 px y estados de foco visibles.
7. No depender de drag-and-drop; si se incorpora, el input tradicional permanece disponible.
8. Confirmar `Retirar logo` porque bloquea nuevas emisiones.

## 14. Web: organizacion recomendada

```text
apps/web/src/features/backoffice/
  api/
    tenant-branding-api.ts
  components/
    tenant-branding-panel.tsx
  model/
    tenant-branding-queries.ts
```

Responsabilidades:

1. API: construir requests multipart y descargar blob.
2. Queries: cache keys, carga, reemplazo, retiro e invalidaciones.
3. Panel: estado visual e interacciones.
4. Pagina: composicion y navegacion, sin logica de archivo duplicada.

No se agregaran llamadas de red directamente dentro del componente visual ni se duplicara el parseo de errores existente.

## 15. Configuracion y almacenamiento

Agregar a la API:

```text
TENANT_ASSETS_DIR=/tmp/cuidarte/tenant-assets
```

Reglas:

1. `env.ts` valida el valor.
2. El adaptador local es valido para desarrollo y pruebas.
3. Produccion debe usar volumen persistente o un adaptador de object storage.
4. La interfaz de storage no debe depender de APIs especificas de S3.
5. Nunca almacenar imagenes Base64 en PostgreSQL, contratos o logs.

## 16. Auditoria

Eventos:

- `tenant.logo_uploaded`
- `tenant.logo_replaced`
- `tenant.logo_removed`
- se mantiene la auditoria existente de exportacion de formato

Metadata de branding:

- `tenantId`
- `logoVersionId`
- `previousLogoVersionId`, cuando aplique
- `originalName`
- `mimeType`
- `sizeBytes`
- `checksum`
- `actorUserId`

No incluir buffers, Base64, rutas absolutas ni cookies en auditoria.

## 17. Manejo de errores

| Estado | Caso |
| --- | --- |
| `400` | Multipart invalido, mas de un archivo, campo inesperado, imagen vacia, tipo o dimensiones no permitidos |
| `401` | Sesion ausente o invalida |
| `403` | Actor sin rol `super_admin` en endpoints administrativos |
| `404` | Tenant inexistente o logo activo inexistente al solicitar preview |
| `409` | Nueva emision solicitada para un tenant sin logo activo |
| `413` | Archivo supera el limite permitido, cuando Fastify corta la carga |
| `500` | Fallo no recuperable de almacenamiento, procesamiento o persistencia |

Los mensajes funcionales deben explicar causa y recuperacion sin revelar rutas o detalles internos.

## 18. Pruebas requeridas

### 18.1 Contracts

1. Metadata valida.
2. Rechazo de checksum o MIME invalido.
3. Detalle con `logo: null` y con logo.

### 18.2 ImageProcessor

1. PNG, JPEG y WebP validos se normalizan a PNG.
2. Archivo vacio, SVG, GIF, contenido falso y archivo sobredimensionado se rechazan.
3. Dimensiones fuera de rango se rechazan.
4. Metadata se elimina y proporcion se conserva.
5. Checksum corresponde al resultado normalizado.

### 18.3 Storage

1. Escritura y lectura por tenant.
2. Nombres fisicos aleatorios.
3. Rechazo de path traversal.
4. Eliminacion best-effort de un archivo huerfano tras fallo de persistencia.

### 18.4 Repository y Service

1. Primera carga crea version y asignacion.
2. Reemplazo crea otra version sin modificar la anterior.
3. Retiro conserva versiones.
4. Tenant inexistente produce `404`.
5. Actor no autorizado produce `403`.
6. Auditoria registra version anterior y nueva.
7. Fallo de DB activa compensacion del archivo nuevo.
8. Resolucion devuelve una version perteneciente al tenant correcto.

### 18.5 Controller

1. Requiere multipart.
2. Acepta exactamente el campo `logo`.
3. Rechaza campos o archivos adicionales.
4. Configura correctamente headers del preview.
5. Protege todos los endpoints con sesion y rol.

### 18.6 Alimentacion y PDF

1. Tenant A y Tenant B generan formatos con logos distintos.
2. Nueva emision sin logo retorna `409` y no inicia Chromium.
3. La emision guarda el ID exacto de version del logo.
4. Reemplazar el logo no cambia una emision existente.
5. Una nueva emision posterior al reemplazo usa la nueva version.
6. El template escapa el nombre del tenant.
7. El encabezado conserva su layout con logos horizontales, verticales y transparentes.
8. Emisiones legacy con snapshot `null` siguen descargando.

### 18.7 Web

1. Estado vacio comunica que el logo es requerido para nuevas emisiones.
2. Seleccion muestra preview y nombre del archivo.
3. Archivo invalido muestra error junto al control.
4. Boton se bloquea durante la carga.
5. Reemplazo invalida metadata y preview anteriores.
6. Object URLs se revocan.
7. Retiro requiere confirmacion.
8. Flujo completo es operable con teclado.

### 18.8 E2E

1. SuperAdmin abre un tenant, carga logo y ve la vista previa.
2. Exporta un formato nuevo y el PDF contiene el logo correspondiente.
3. Reemplaza el logo y comprueba que el PDF historico no cambia.
4. Otro tenant usa una imagen diferente sin cruce de datos.

## 19. Criterios de aceptacion (DoD)

1. Cada tenant puede tener una version de logo activa independiente.
2. Solo SuperAdmin puede administrar logos.
3. La imagen se valida por contenido real y se normaliza antes de persistir.
4. El detalle de tenant muestra metadata y preview sin exponer rutas internas.
5. Toda nueva emision incluye el logo del tenant y registra su version.
6. Una nueva emision sin logo se bloquea con mensaje accionable.
7. Los PDF historicos permanecen binariamente iguales despues de reemplazar o retirar el logo.
8. No existe acceso cruzado entre tenants.
9. Cargas, reemplazos y retiros quedan auditados.
10. Los tests unitarios, de integracion y web relevantes pasan.
11. `pnpm typecheck`, `pnpm test` y `pnpm build` pasan para los paquetes afectados.
12. No se introduce logica de filesystem, base de datos o autorizacion en controllers, componentes visuales o templates.

## 20. Plan de implementacion por entregas pequenas

### Entrega 1 - Modelo y contratos

1. Migracion Drizzle.
2. Schemas y tipos compartidos.
3. Repository de branding y pruebas.

### Entrega 2 - Procesamiento y almacenamiento

1. `TenantLogoImageProcessor`.
2. Interfaz de storage y adaptador local.
3. Validaciones, compensacion y pruebas de seguridad.

### Entrega 3 - API administrativa

1. Service de casos de uso.
2. Controller multipart.
3. Auditoria y pruebas de permisos.

### Entrega 4 - BackOffice web

1. Cliente API y queries.
2. Panel de identidad visual.
3. Preview, reemplazo, retiro y estados accesibles.

### Entrega 5 - Integracion Alimentacion

1. Resolucion de logo activo.
2. Ajuste de plantilla para dos logos.
3. Snapshot en emision.
4. Compatibilidad con historicos.

### Entrega 6 - QA y despliegue

1. Pruebas unitarias, integracion y E2E.
2. Validacion visual del PDF impreso.
3. Configuracion de storage persistente en el ambiente objetivo.
4. Carga progresiva de logos para tenants existentes.

## 21. Reglas explicitas para evitar codigo spaghetti

1. Un archivo o clase debe tener una responsabilidad principal verificable.
2. Los controllers no contienen reglas de negocio.
3. Los componentes React no hacen `fetch` directo.
4. Las queries SQL viven exclusivamente en repositories.
5. El filesystem u object storage se consume exclusivamente mediante su puerto de dominio.
6. El procesamiento de imagen no se duplica entre controller, service y web.
7. La plantilla PDF permanece como funcion pura.
8. Alimentacion no depende de BackOffice; ambos dependen de `tenant-branding` mediante APIs publicas del modulo.
9. No crear utilidades genericas prematuras; extraer solo conceptos de dominio con nombre concreto.
10. No usar booleanos ambiguos como `replace = true`; usar casos de uso y metodos con nombres explicitos.
11. No capturar errores con `catch` vacios salvo compensaciones best-effort documentadas.
12. No mezclar persistencia de metadata, procesamiento del binario y render PDF en un mismo servicio.
13. Toda dependencia externa se inyecta mediante constructor o token; no usar service locator.
14. No introducir imports profundos entre paquetes; `@cuidarte/contracts` es el limite compartido.
15. Toda regla critica debe tener una prueba en el nivel mas cercano donde se implementa.

## 22. Riesgos y mitigaciones

1. **Storage efimero en produccion.**
   Mitigacion: volumen persistente u object storage antes de habilitar la funcionalidad.
2. **Archivo disfrazado como imagen.**
   Mitigacion: decodificacion real y normalizacion en servidor.
3. **Carrera entre reemplazo y emision.**
   Mitigacion: resolver una version inmutable y guardar ese mismo ID en el snapshot.
4. **Crecimiento de versiones.**
   Mitigacion: conservar por trazabilidad en esta fase y definir politica de retencion posterior para versiones nunca referenciadas.
5. **Cambio de paginacion del PDF.**
   Mitigacion: caja de encabezado con dimensiones fijas y pruebas visuales con diferentes proporciones.
6. **Tenant existente sin logo.**
   Mitigacion: estado visible `Logo pendiente`, carga progresiva y error funcional antes de generar.
7. **Acoplamiento futuro con otros documentos.**
   Mitigacion: modulo de branding reutilizable; cada exportador decide explicitamente cuando consumirlo.

## 23. Validaciones previas al cierre funcional

Antes de pasar el spec a `accepted`, producto debe confirmar:

1. que el logo institucional y el logo del tenant deben convivir en el encabezado;
2. que solo SuperAdmin administra el logo en la primera fase;
3. que la ausencia de logo bloquea nuevas emisiones;
4. que no se regeneraran PDF historicos;
5. que PNG, JPEG y WebP con limite de 2 MB cubren los archivos reales disponibles.
