# SPEC: Catálogo de Departamentos y Municipios Dependientes

- Estado: proposed
- Fecha: 2026-08-08
- Modulo: `ubicaciones`
- Alcance: normalizacion de departamentos y municipios para formularios con dependencias jerarquicas

## 1. Objetivo

Eliminar la captura manual de departamento y municipio en formularios del sistema, usando un catalogo persistido en BD con relacion padre-hijo, de forma que:

1. El usuario seleccione primero un departamento.
2. El sistema consulte y muestre solo los municipios asociados a ese departamento.
3. La persistencia y el intercambio de datos operen con IDs, no con nombres.

## 2. Opinion experta

1. **La decision correcta es normalizar el modelo y guardar IDs.**
Trabajar con texto libre en este caso degrada calidad de datos, complica validaciones y abre la puerta a inconsistencias historicas.
Tomamos la Opcion A: el formulario y la persistencia deben trabajar con IDs, no con nombres :codex-annotation{index="1"}.
2. **No recomiendo resolver esto solo en frontend.**
El frontend puede guiar la seleccion, pero el backend debe validar que el municipio pertenezca al departamento antes de guardar.
3. **No recomiendo reutilizar los campos de texto como fuente de verdad.**
Los nombres pueden mantenerse como salida de lectura o compatibilidad temporal, pero no como contrato principal de escritura.
4. **No recomiendo una lista estatica embebida en el codigo.**
Los catalogos deben vivir en BD para permitir mantenimiento, trazabilidad y futuras sincronizaciones.

## 3. Problema actual

Hoy los formularios usan campos libres para `department`, `municipality`, `city` y otros datos de ubicacion.
Eso provoca:

1. Errores de digitacion.
2. Variantes semanticas equivalentes pero distintas en texto.
3. Dificultad para filtrar, reportar y consolidar informacion.
4. Validaciones duplicadas entre frontend y backend.

## 4. Alcance funcional

### 4.1 Incluido

1. Catalogo de `departments` en BD.
2. Catalogo de `municipalities` en BD con FK hacia `departments`.
3. Endpoint para listar departamentos activos.
4. Endpoint para listar municipios por `departmentId`.
5. Cambio de formularios para usar selects dependientes.
6. Persistencia con `departmentId` y `municipalityId`.
7. Validacion backend de la relacion municipio-departamento.
8. Backfill de registros existentes a partir de los valores actuales de texto.

### 4.2 Fuera de alcance

1. Geolocalizacion automatica por GPS.
2. Autocomplete por mapa o terceros.
3. Normalizacion de barrios, veredas o corregimientos.
4. Integracion con una API externa de codigos DANE si no existe una decision explicita para esta fase.

## 5. Reglas de negocio

1. El usuario siempre selecciona primero un departamento.
2. El selector de municipio permanece deshabilitado hasta que exista un departamento valido.
3. Si el usuario cambia el departamento, el municipio debe limpiarse.
4. Solo se pueden guardar municipios que pertenezcan al departamento seleccionado.
5. En edicion, el formulario debe precargar ambos IDs y resolver la lista de municipios del departamento actual.
6. Si un registro historico no puede mapearse a un catalogo nuevo, debe quedar marcado para saneamiento manual y no bloquear el despliegue.

## 6. Modelo de datos propuesto

### 6.1 Tabla `departments`

Campos recomendados:

1. `id`
2. `name`
3. `code` opcional
4. `is_active`
5. `created_at`
6. `updated_at`

Reglas:

1. `name` unico o al menos normalizado para evitar duplicados.
2. `code` puede usarse para compatibilidad con catalogos oficiales si se dispone de el.
3. `is_active` permite desactivar registros sin borrarlos fisicamente.

### 6.2 Tabla `municipalities`

Campos recomendados:

1. `id`
2. `department_id`
3. `name`
4. `code` opcional
5. `is_active`
6. `created_at`
7. `updated_at`

Reglas:

1. `department_id` es obligatoria.
2. Debe existir indice compuesto por `department_id + name`.
3. No debe haber ambiguedad entre municipios del mismo departamento.
4. La integridad referencial debe impedir municipios huérfanos.

### 6.3 Cambios en tablas consumidoras

Los formularios que hoy almacenan texto deben migrar a IDs:

1. `adultos_mayores`
   - agregar `department_id`
   - agregar `municipality_id`
   - mantener temporalmente `department` y `municipality` solo si el plan de migracion requiere compatibilidad de lectura
2. `tenants`
   - agregar `department_id`
   - agregar `municipality_id` o `city_id` segun el modelo final que se confirme para sedes
   - si `city` sigue siendo un concepto de negocio distinto, documentarlo como separado y no mezclarlo con municipio

## 7. Contratos compartidos

### 7.1 Ubicacion

Crear contratos para:

1. `department`:
   - `id`
   - `name`
2. `municipality`:
   - `id`
   - `departmentId`
   - `name`

### 7.2 Formularios

Los requests de creacion y edicion deben aceptar:

1. `departmentId`
2. `municipalityId`

Si se mantiene compatibilidad temporal:

1. Los contratos de lectura pueden exponer `departmentName` y `municipalityName`.
2. La escritura no debe depender de nombres.

## 8. API propuesta

### 8.1 Listar departamentos

`GET /api/ubicaciones/departments`

Respuesta:

```json
{
  "departments": [
    { "id": "uuid", "name": "Cundinamarca" }
  ]
}
```

### 8.2 Listar municipios por departamento

`GET /api/ubicaciones/departments/:departmentId/municipalities`

Respuesta:

```json
{
  "municipalities": [
    { "id": "uuid", "departmentId": "uuid", "name": "Soacha" }
  ]
}
```

### 8.3 Validacion de escritura

En cualquier endpoint que persista ubicacion:

1. Validar que `departmentId` exista.
2. Validar que `municipalityId` exista.
3. Validar que `municipality.departmentId === departmentId`.
4. Rechazar con `400` si la relacion no cuadra.

## 9. Arquitectura recomendada

### 9.1 API

1. Crear un modulo `ubicaciones` con:
   - controller
   - service
   - repository
2. Reutilizar el patron de catalogos versionados del proyecto cuando aplique.
3. Exponer consultas simples, sin logica de negocio en el controller.
4. Centralizar la validacion de integridad en el service.

### 9.2 Web

1. Crear queries con React Query para departamentos y municipios.
2. Cargar departamentos al inicializar el formulario.
3. Cargar municipios cuando cambie el departamento.
4. Deshabilitar municipio mientras no exista departamento.
5. Limpiar municipio al cambiar departamento.

### 9.3 Formularios impactados

1. `adultos-mayores`
2. `backoffice` de tenants
3. Cualquier otro formulario que hoy use departamento/municipio como texto libre

## 10. Estrategia de migracion

### 10.1 Fase 1

1. Crear catalogos.
2. Exponer endpoints.
3. Adaptar frontend.
4. Mantener compatibilidad de lectura si es necesario.

### 10.2 Fase 2

1. Agregar columnas nuevas de IDs en tablas consumidoras.
2. Backfill de registros historicos.
3. Actualizar contratos y servicios para operar con IDs.
4. Eliminar uso de texto libre como entrada principal.

### 10.3 Backfill

1. Normalizar los textos existentes.
2. Resolver coincidencias exactas primero.
3. Registrar casos ambiguos para revision manual.
4. No bloquear la migracion por registros historicos imposibles de mapear en una primera pasada.

## 11. Reglas de calidad

1. Evitar duplicar listas de municipios en el frontend.
2. Evitar hardcodear nombres de departamentos y municipios en componentes.
3. Evitar guardar strings derivados como fuente de verdad.
4. Mantener una sola responsabilidad por capa:
   - UI: seleccion
   - API: validacion
   - BD: integridad y relacion

## 12. Errores esperados

1. `400`: municipio no pertenece al departamento seleccionado.
2. `400`: departmentId o municipalityId faltante.
3. `404`: departamento no encontrado.
4. `404`: municipio no encontrado.
5. `409`: conflicto de integridad si un registro historico intenta guardarse con combinacion invalida.

## 13. Criterios de aceptacion

1. El usuario puede seleccionar un departamento y ver solo sus municipios.
2. El municipio no es seleccionable sin un departamento previo.
3. Los datos se guardan con IDs.
4. El backend rechaza relaciones invalidas entre departamento y municipio.
5. Los formularios de edicion precargan correctamente la ubicacion.
6. Los registros historicos pueden leerse sin perder el significado de ubicacion.
7. No se introduce regresion en otros formularios que consumen datos de sede o ubicacion.

## 14. Riesgos y mitigacion

1. Riesgo: la tabla historica tiene nombres con variaciones ortograficas.
Mitigacion: normalizacion, alias y backfill asistido.
2. Riesgo: el catalogo oficial cambia o viene incompleto.
Mitigacion: versionado de catalogo y carga validada.
3. Riesgo: confundir `municipio` con `ciudad` en sedes.
Mitigacion: documentar si son dominios distintos antes de mezclar el modelo.
4. Riesgo: el frontend precarga municipios incorrectos en edicion.
Mitigacion: usar `departmentId` como source of truth y no el nombre visible.

## 15. Plan de implementacion recomendado

### Entrega 1 - Modelo y catalogos

1. Crear tablas `departments` y `municipalities`.
2. Cargar catalogo inicial.
3. Agregar indices e integridad referencial.

### Entrega 2 - API de consulta

1. Endpoint de departamentos.
2. Endpoint de municipios por departamento.
3. Tests de contrato y filtrado.

### Entrega 3 - Formularios

1. Migrar selects de departamentos y municipios.
2. Integrar React Query.
3. Manejar reset de municipio al cambiar departamento.

### Entrega 4 - Persistencia con IDs

1. Ajustar contratos.
2. Ajustar services y repositories.
3. Validar integridad antes de escribir.

### Entrega 5 - Migracion de historicos

1. Backfill.
2. Reporte de inconsistencias.
3. Eliminacion progresiva del uso de texto libre como campo editable.

## 16. Decisiones cerradas

1. Se usara modelo normalizado con IDs.
2. El municipio dependera del departamento en la API y en la UI.
3. El backend validara la pertenencia antes de guardar.
4. Los nombres se usaran para mostrar, no para identificar.

