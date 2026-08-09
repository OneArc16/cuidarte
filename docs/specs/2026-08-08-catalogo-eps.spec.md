# SPEC: Catalogo de EPS para Adultos Mayores

- Estado: implemented
- Datos de produccion: pendientes de cargar mediante `EPS_REFERENCE_DATA_FILE`
- Fecha: 2026-08-08
- Modulo: `eps`
- Alcance: normalizacion de EPS y seleccion mediante buscador reutilizable en Adultos Mayores

## 1. Objetivo

Reemplazar el campo de texto libre `eps` de Adultos Mayores por una referencia a un catalogo persistido en BD. El sistema debe guardar el ID interno de la EPS y mostrar su nombre en el formulario, listados y detalles.

La solucion debe evitar variantes de escritura, preservar los registros historicos, permitir desactivar EPS sin borrar referencias existentes y reutilizar el combobox de busqueda ya disponible.

## 2. Decisiones de arquitectura

1. Se crea el dominio independiente `eps`; no se agrega al modulo `ubicaciones` porque no es una ubicacion geografica.
2. La tabla usa un UUID interno como clave primaria.
3. El archivo Excel aporta `code`, `nit` y `name`. La columna `id de EPS` se descarta y no se persiste.
4. `code` es la identidad principal para importar y actualizar el catalogo. `nit` se conserva para trazabilidad y puede repetirse cuando varios codigos pertenecen a la misma entidad juridica.
5. Los nuevos comandos de Adultos Mayores aceptan `epsId`; no aceptan texto libre de EPS como entrada.
6. La EPS permanece opcional, para conservar la regla actual del producto.
7. El campo legado `adultos_mayores.eps` se conserva temporalmente para lectura y backfill. No es fuente de verdad para nuevos registros.
8. El frontend reutiliza `SearchableCombobox` con busqueda local desde tres caracteres. La busqueda no recarga ni navega la pagina.

## 3. Problema actual

Actualmente `adultos_mayores.eps` guarda un texto nullable de hasta 160 caracteres. Esto permite:

1. Diferentes nombres para la misma EPS.
2. Errores ortograficos y datos incompletos.
3. Reportes y filtros no confiables.
4. Imposibilidad de controlar que una EPS este vigente.

## 4. Alcance

### 4.1 Incluido

1. Tabla `eps` y migracion de `adultos_mayores.eps_id`.
2. Importador idempotente para el Excel de EPS.
3. Endpoint autenticado para listar EPS activas.
4. Validacion de `epsId` en creacion y actualizacion de Adultos Mayores.
5. Cambios de contratos, dominio, repositorio y respuestas de Adultos Mayores.
6. Combobox reutilizable de EPS en el formulario de Adultos Mayores.
7. Backfill determinista de datos historicos y reporte de pendientes.
8. Pruebas de datos, API, persistencia y formulario.

### 4.2 Fuera de alcance

1. Administracion manual de EPS desde BackOffice.
2. Sincronizacion automatica con una API externa.
3. Asociar EPS con el regimen de salud como dependencia obligatoria.
4. Eliminar la columna heredada `adultos_mayores.eps` en esta entrega.
5. Cambiar EPS en otros modulos que no pertenezcan a Adultos Mayores.

## 5. Modelo de datos

### 5.1 Tabla `eps`

| Columna           | Tipo                     | Regla                                                    |
| ----------------- | ------------------------ | -------------------------------------------------------- |
| `id`              | UUID                     | PK interna, `defaultRandom()`                            |
| `code`            | varchar(40)              | Obligatoria, unica y estable para importaciones          |
| `nit`             | varchar(20)              | Obligatorio, indexado, almacenado como texto normalizado |
| `name`            | varchar(160)             | Obligatorio, nombre visible                              |
| `name_normalized` | varchar(160)             | Obligatorio, usado para deduplicacion y backfill         |
| `is_active`       | boolean                  | Obligatorio, `true` por defecto                          |
| `created_at`      | timestamp with time zone | Obligatorio                                              |
| `updated_at`      | timestamp with time zone | Obligatorio                                              |

Indices y restricciones:

1. `eps_code_unique` sobre `code`.
2. `eps_nit_idx` sobre `nit`.
3. `eps_name_normalized_unique` sobre `name_normalized`.
4. Indice sobre `is_active`.

Normalizacion:

1. `code`: trim y conversion a mayusculas si la fuente lo admite.
2. `nit`: trim, remover espacios, puntos y guiones; nunca convertir a numero para no perder informacion.
3. `name_normalized`: minusculas, sin tildes, espacios colapsados y trim.

### 5.2 Cambio en `adultos_mayores`

Agregar:

```sql
eps_id uuid references eps(id) on delete restrict
```

Reglas:

1. `eps_id` es nullable porque EPS hoy es un dato opcional.
2. `ON DELETE RESTRICT` evita borrar una EPS que tenga adultos asociados.
3. La columna heredada `eps` se conserva durante la transicion para lectura y recuperacion de datos no mapeados.
4. La escritura nueva actualiza `eps_id`; no debe escribir valores libres en `eps`.

## 6. Fuente e importacion

### 6.1 Archivo fuente

El Excel debe contener al menos estas columnas:

| Columna Excel | Destino              | Requerida |
| ------------- | -------------------- | --------- |
| `codigo`      | `eps.code`           | Si        |
| `nit`         | `eps.nit`            | Si        |
| `nombre`      | `eps.name`           | Si        |
| `id de EPS`   | Ninguno, se descarta | No        |

Antes de importar se debe validar:

1. Encabezados presentes y sin ambiguedad.
2. Codigo, NIT y nombre no vacios despues de normalizar.
3. No existan codigos o nombres normalizados duplicados dentro del archivo.
4. El archivo no contenga filas invalidas silenciosamente; se entrega un reporte con fila, columna y motivo.

### 6.2 Importador idempotente

1. Crear un parser de Excel separado de la logica de persistencia.
2. Hacer `upsert` por `code` dentro de una transaccion.
3. Si el mismo `code` trae un NIT distinto, abortar con error de integridad; no sobrescribir automaticamente.
4. Permitir que varios `code` compartan NIT cuando pertenecen a la misma entidad juridica.
5. Actualizar `name`, `name_normalized`, `nit`, `is_active` y `updated_at` solo cuando los datos sean consistentes.
6. Registrar version, checksum, fuente y cantidad de filas en `reference_data_versions` con dataset `eps`.
7. Publicar un script explicito de importacion; nunca cargar el Excel desde el frontend.

## 7. Contratos compartidos

Agregar contratos en `packages/contracts`:

```ts
epsOptionSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});

epsListResponseSchema = z.object({
  eps: z.array(epsOptionSchema),
});
```

Cambios de Adultos Mayores:

1. Los comandos de creacion y actualizacion reciben `epsId: z.uuid().nullable()`.
2. Las respuestas exponen `epsId: z.uuid().nullable()` y `epsName: z.string().nullable()`.
3. Durante la transicion se puede conservar `eps` como alias de lectura deprecado para clientes existentes. Si existe EPS relacionada, su valor se deriva de `eps.name`; si no existe, se usa el texto legado.
4. Los contratos de escritura no aceptan `eps` como texto libre.

## 8. API y reglas de negocio

### 8.1 Consultar EPS

`GET /api/eps`

Respuesta:

```json
{
  "eps": [
    {
      "id": "uuid",
      "code": "EPS001",
      "name": "EPS Ejemplo"
    }
  ]
}
```

Reglas:

1. Requiere un usuario autenticado.
2. Devuelve EPS activas ordenadas por nombre ascendente.
3. No requiere parametro de busqueda en esta fase: el catalogo es pequeno y el frontend filtra localmente.
4. La respuesta no expone el NIT al formulario porque no es necesario para seleccionar.

### 8.2 Escritura de Adultos Mayores

1. Si `epsId` es `null`, guardar `eps_id = null`.
2. Si `epsId` existe, validar que la EPS exista antes de guardar.
3. En creacion, la EPS seleccionada debe estar activa.
4. En actualizacion, se puede conservar la referencia a una EPS inactiva, pero no cambiar hacia una EPS inactiva.
5. Si la EPS no existe o no puede seleccionarse, responder `400` con un mensaje de negocio claro.
6. El controller no contiene reglas: la validacion corresponde al servicio de Adultos Mayores y/o al servicio de EPS.

Errores esperados:

1. `400`: `La EPS seleccionada no existe.`
2. `400`: `La EPS seleccionada no se encuentra activa.`
3. `409`: conflicto de NIT, codigo o nombre normalizado durante importacion.

## 9. Experiencia de usuario

En la seccion Salud del formulario de Adultos Mayores:

1. Reemplazar el input de texto `EPS` por `SearchableCombobox`.
2. Cargar el catalogo mediante React Query y cachearlo.
3. Mostrar resultados solo luego de tres caracteres.
4. Filtrar ignorando tildes y diferencias de mayusculas/minusculas.
5. Permitir seleccion por raton y teclado.
6. Permitir borrar una seleccion y escribir otra sin que un fallback la reponga.
7. Mostrar `Selecciona una EPS de la lista.` solo si el producto vuelve EPS obligatoria. Mientras sea opcional, permitir campo vacio.
8. Mostrar `No se encontraron EPS.` cuando la busqueda no tenga coincidencias.

Compatibilidad de edicion:

1. Si el adulto ya tiene `epsId`, precargar el nombre de esa EPS.
2. Si solo tiene texto legado, intentar resolver una coincidencia por `name_normalized` una unica vez.
3. Una interaccion manual del usuario anula el fallback; nunca debe volver a insertar el texto anterior.
4. Si no hay coincidencia, mostrar el texto historico como informacion de solo lectura o advertencia de saneamiento, sin convertirlo automaticamente en una nueva EPS.

## 10. Migracion y backfill

### 10.1 Orden de despliegue

1. Crear tabla `eps`, migracion de `eps_id` y sus indices.
2. Importar y validar el catalogo del Excel.
3. Ejecutar backfill en modo reporte.
4. Corregir conflictos o aprobar pendientes.
5. Ejecutar backfill de escritura en transaccion.
6. Desplegar API que lea y escriba `epsId`.
7. Desplegar frontend con el combobox.
8. Monitorear pendientes antes de planear la eliminacion del campo legado.

### 10.2 Algoritmo de backfill

1. Procesar solo adultos con `eps_id IS NULL` y texto `eps` no vacio.
2. Normalizar el texto usando la misma funcion que genero `name_normalized`.
3. Resolver coincidencia exacta contra `eps.name_normalized`.
4. Si hay una coincidencia, asignar `eps_id` y conservar `eps` como evidencia historica durante la transicion.
5. Si no hay coincidencia, no modificar el registro y agregarlo al reporte.
6. Nunca usar coincidencias parciales, fuzzy matching o asignaciones masivas no verificadas.

Reporte minimo de pendientes:

1. ID del adulto mayor.
2. Tenant.
3. Texto EPS original.
4. Texto normalizado.
5. Motivo de no asignacion.

## 11. Arquitectura de implementacion

### 11.1 API

1. Crear modulo `eps` con controller, service, repository y contratos propios.
2. Mantener queries de catalogo en el repository y reglas de vigencia en el service.
3. Integrar la validacion de `epsId` en el servicio de Adultos Mayores, sin consultas desde el controller.
4. Extender la consulta de detalles/listados con left join a `eps` para obtener `epsName`.
5. Reutilizar las utilidades de CSV/normalizacion solo si el Excel se transforma de manera aislada; no acoplar la importacion a ubicaciones.

### 11.2 Web

1. Crear `features/eps/api` y `features/eps/model` para API y React Query.
2. Reutilizar `SearchableCombobox`; no crear otra implementacion de autocomplete.
3. Mantener el estado del formulario en React Hook Form mediante `Controller`.
4. Mantener el filtrado y presentacion dentro del componente reutilizable; la carga de datos y reglas de formulario permanecen en la feature.

## 12. Pruebas requeridas

### 12.1 Datos y BD

1. El parser rechaza encabezados o filas invalidas.
2. La importacion es idempotente.
3. Se rechazan codigos o nombres normalizados duplicados.
4. `eps_id` impide referencias inexistentes.
5. El backfill solo asigna coincidencias exactas y reporta las no resueltas.

### 12.2 API y dominio

1. `GET /api/eps` devuelve solo EPS activas y ordenadas.
2. Crear Adulto Mayor con EPS activa persiste `epsId`.
3. Crear con EPS inexistente o inactiva falla con el mensaje esperado.
4. Actualizar conservando una EPS inactiva ya asociada es valido.
5. La respuesta de detalle expone ID y nombre de EPS.

### 12.3 Web

1. El combobox no muestra opciones antes de tres caracteres.
2. La seleccion envia el UUID de EPS y no el nombre.
3. Se puede borrar una EPS seleccionada y buscar otra.
4. La edicion precarga `epsId`.
5. Un texto legado sin coincidencia no se sobrescribe ni se pierde.
6. La busqueda no genera recarga de pagina ni una peticion por cada pulsacion.

## 13. Criterios de aceptacion

1. El Excel se importa sin usar ni persistir su columna `id de EPS`.
2. Cada EPS persistida tiene `code`, `nit`, nombre y UUID interno validos.
3. No se pueden crear duplicados por codigo o nombre normalizado; el NIT puede identificar varios codigos.
4. Adultos Mayores guarda `eps_id`, no un nombre libre nuevo.
5. El formulario permite buscar desde tres caracteres y seleccionar una EPS.
6. La pagina no se recarga al buscar ni al seleccionar.
7. Los datos historicos no mapeados permanecen visibles y aparecen en un reporte.
8. La API rechaza EPS inexistentes e inactivas de acuerdo con las reglas definidas.
9. Las pruebas requeridas existen y pasan antes del despliegue.

## 14. Riesgos y mitigaciones

1. Riesgo: el archivo trae codigos o nombres normalizados duplicados.
   Mitigacion: validar todo el archivo antes de escribir y abortar la importacion; los NIT repetidos se conservan porque pueden agrupar varios codigos.

2. Riesgo: los textos EPS historicos no coinciden exactamente con el nuevo catalogo.
   Mitigacion: reporte de pendientes y correccion manual; no usar fuzzy matching.

3. Riesgo: una EPS cambia de nombre o se desactiva.
   Mitigacion: identificar por `code`, conservar `is_active` y restringir borrado fisico.

4. Riesgo: el campo legado se mantiene indefinidamente.
   Mitigacion: definir una revision posterior basada en el reporte de backfill antes de eliminarlo.

## 15. Plan de entrega

### Entrega 1 - Catalogo y carga

1. Migracion de BD.
2. Parser, validacion e importador del Excel.
3. Versionado de datos de referencia.

### Entrega 2 - API y contratos

1. Modulo EPS.
2. Endpoint de consulta.
3. Contratos y validacion de Adultos Mayores.

### Entrega 3 - Formulario

1. Query de EPS en web.
2. Integracion con `SearchableCombobox`.
3. Compatibilidad de edicion y mensajes de error.

### Entrega 4 - Datos historicos

1. Backfill en modo reporte.
2. Correccion de pendientes.
3. Backfill definitivo y verificacion.

### Entrega 5 - Limpieza futura

1. Medir registros sin `eps_id`.
2. Aprobar una migracion separada para retirar `adultos_mayores.eps` cuando no sea necesario conservarlo.
