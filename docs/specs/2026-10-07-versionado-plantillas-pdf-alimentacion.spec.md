# SPEC: Versionado de Plantillas PDF de Alimentacion

- Estado: proposed
- Fecha: 2026-10-07
- Modulo: `registro-alimentacion`
- Fase: reutilizacion segura de emisiones PDF
- Complementa:
  - `docs/specs/alimentacion-formato-entrega-individual-v2.spec.md`
  - `docs/specs/2026-07-22-logo-centro-vida-formatos-alimentacion.spec.md`

## 1. Objetivo

Hacer que la reutilizacion de un PDF de entrega de alimentacion dependa de una version explicita de su plantilla, y no de la fecha en que fue emitido.

El sistema debe conservar todas las emisiones y archivos historicos. Cuando cambie la presentacion del documento (por ejemplo, el membrete), el siguiente ZIP o descarga debe emitir una nueva version del PDF automaticamente, sin modificar ni eliminar las filas anteriores.

## 2. Problema que resuelve

La regla actual usa fechas de despliegue para decidir si una emision almacenada puede reutilizarse. Esto es fragil: una fecha de corte puede no coincidir con la hora efectiva de la imagen que llego a produccion, por lo que un PDF sin el recurso visual esperado puede ser considerado reutilizable.

El incidente del membrete se corrige de forma transitoria con un corte en `2026-10-07T16:36:00.000Z`. Esta especificacion sustituye esa estrategia por una regla durable y auditable.

## 3. Alcance

### 3.1 Incluido

1. Versionar la plantilla del formato de entrega de alimentacion.
2. Persistir la version usada en cada nueva emision.
3. Reemitir bajo demanda cuando la version persistida no coincida con la version vigente.
4. Mantener intactas las emisiones y archivos previos.
5. Impedir la emision de nuevos PDFs si el membrete obligatorio no esta disponible en produccion.
6. Registrar la version de plantilla en la auditoria de la emision.

### 3.2 Fuera de alcance

1. Cambiar el diseño actual del formato.
2. Regenerar masivamente PDFs o ZIPs ya descargados.
3. Generalizar de inmediato el mecanismo a actas de actividades grupales, reportes de dashboard u otros documentos.
4. Calcular hashes automaticos del codigo HTML o CSS de la plantilla.
5. Eliminar archivos o filas historicas.

## 4. Decisiones de arquitectura

### 4.1 Version explicita, manual y centralizada

La API define una constante unica, por ejemplo:

```ts
const ALIMENTACION_FORMAT_TEMPLATE_VERSION = "v3-membrete";
```

La version se incrementa solo cuando haya un cambio que pueda alterar el PDF emitido: membrete, estructura, textos, estilos de impresion, reglas de contenido o recursos institucionales obligatorios.

No se usaran fechas como version de plantilla ni como condicion permanente de reutilizacion. Los cambios de membrete son poco frecuentes; una version declarada es mas legible, simple de revisar y suficiente para el caso de uso.

### 4.2 Regla de reutilizacion

Una emision existente se reutiliza unicamente si se cumplen todas estas condiciones:

1. `templateVersion` coincide exactamente con `ALIMENTACION_FORMAT_TEMPLATE_VERSION`.
2. La firma activa y su version coinciden con el snapshot de la emision.
3. El logo activo del tenant coincide con el snapshot de la emision.
4. No hay registros de alimentacion modificados despues de la emision.
5. La cantidad y el rango de fechas de los registros coinciden con el snapshot.
6. El archivo PDF de la emision puede leerse desde el almacenamiento.

Si cualquiera falla, se genera un PDF nuevo y se crea una nueva emision con la siguiente version documental. Las emisiones previas siguen disponibles para auditoria.

```text
Solicitud de PDF o ZIP
        ↓
Emision mas reciente
        ↓
¿Version de plantilla + snapshots + datos coinciden?
   ├─ Si → devolver PDF existente
   └─ No → generar PDF y registrar nueva emision
```

### 4.3 Emisiones legacy

Las emisiones existentes antes de este cambio no tienen una version de plantilla verificable. Su `templateVersion` quedara en `null` (o se identificara como `legacy-unknown` si se requiere mostrarla), y nunca sera reutilizable por la regla nueva.

Se regeneran de forma diferida: solo cuando se solicite ese adulto mayor y mes mediante exportacion individual o un ZIP. No se eliminan sus PDFs ni se ejecutan trabajos masivos.

### 4.4 Membrete obligatorio: fallo seguro

El membrete es un requisito del formato vigente. La API no debe generar silenciosamente un PDF sin membrete.

1. En produccion, la carga de `apps/web/public/logos/membrete.png` debe fallar con un error operativo claro si el archivo no existe, esta vacio o no puede leerse.
2. El servicio de exportacion debe responder con error y no guardar una emision nueva en ese caso.
3. El despliegue debe validar que el asset exista dentro de la imagen final de API antes de iniciar el contenedor.
4. Los PDFs historicos ya almacenados siguen descargables; esta validacion aplica a toda nueva generacion.

## 5. Modelo de datos y migracion

### 5.1 Tabla `alimentacion_formato_emissions`

Agregar la columna:

```text
template_version varchar(80) nullable
```

Reglas:

1. La migracion crea la columna nullable, sin actualizar ni borrar las filas existentes.
2. Toda emision creada por la version nueva de la API debe persistir un valor no vacio.
3. La aplicacion trata `null` como no reutilizable.
4. No se agrega `NOT NULL` mientras haya emisiones legacy; hacerlo requeriria una decision explicita de backfill historico.

La columna no necesita indice en esta fase: la API consulta una sola emision reciente por adulto mayor y mes, y compara el valor en memoria.

### 5.2 Tipos, repositorio y auditoria

Se agregara `templateVersion` a:

1. `AlimentacionFormatoEmissionRecord`.
2. `CreateAlimentacionFormatoEmissionCommand`.
3. El `select`, `insert` y mapper de `DrizzleAlimentacionRepository`.
4. Los metadata de auditoria `alimentacion.formato_emitted` y `alimentacion.formato_reissued`.

## 6. Cambios de aplicacion

### 6.1 Servicio de exportacion

`AlimentacionFormatoExportService` debe:

1. usar la constante central de version al evaluar `shouldReuseExistingEmission()`;
2. persistir la misma version al crear la nueva emision;
3. retirar los cortes de fecha de plantilla una vez desplegado este mecanismo;
4. conservar los controles actuales sobre firma, logo, registros y archivo almacenado.

La correccion temporal del corte de `2026-10-07T16:36:00.000Z` permanece hasta que esta migracion y el nuevo codigo esten desplegados. Al entrar en vigor el versionado, las emisiones sin `templateVersion` ya se invalidan de manera segura y ese corte deja de ser necesario.

### 6.2 Recurso estatico y Docker

1. Mantener el membrete versionado en `apps/web/public/logos/membrete.png`.
2. `Dockerfile.api` debe copiarlo a la imagen final, como parte del directorio de logos.
3. Agregar una comprobacion de build que falle si el archivo no existe o tiene tamano cero.
4. Agregar una prueba de integracion o de utilidad que pruebe la resolucion de la ruta desde el directorio de trabajo real de la API.

## 7. Pruebas requeridas

1. Una emision con version vigente, snapshots y datos iguales se reutiliza.
2. Una emision con `templateVersion` distinta se reemite.
3. Una emision con `templateVersion: null` se reemite.
4. La emision nueva persiste la version vigente y la incluye en auditoria.
5. Firma, logo o registros modificados continúan forzando reemision.
6. La ausencia o lectura fallida de `membrete.png` evita el render y el guardado del PDF nuevo.
7. Un ZIP de alimentacion contiene el PDF regenerado cuando su emision anterior es legacy o usa otra version.

## 8. Despliegue y operacion

1. Crear y aplicar la migracion antes o junto al despliegue de API compatible; la columna nullable permite ambos ordenes sin romper lecturas existentes.
2. Construir una imagen de API etiquetada con el SHA del commit, nunca reutilizar un tag mutable para esta entrega.
3. Ejecutar la validacion de asset dentro de la imagen construida.
4. Recrear solamente el contenedor de API con esa imagen.
5. Verificar con una exportacion de un PDF legacy y una segunda descarga consecutiva:
   - la primera crea una nueva emision con la version vigente;
   - la segunda reutiliza esa nueva emision.
6. Monitorear los eventos de reemision y los errores de asset durante la primera semana.

## 9. Criterios de aceptacion

1. Ninguna regla de reutilizacion de plantilla depende de una fecha de despliegue.
2. Toda emision nueva registra una `templateVersion` no vacia.
3. Ninguna emision legacy se reutiliza como si tuviera la plantilla vigente.
4. Un cambio futuro de plantilla se resuelve incrementando una sola constante y desplegando la API.
5. Los PDF y las filas historicas no se eliminan ni se sobrescriben.
6. La API no emite PDFs nuevos sin el membrete obligatorio.
7. Los ZIP nuevos reflejan la version vigente de la plantilla cuando corresponda.

## 10. Plan de implementacion

1. Crear migracion y actualizar schema, tipos, repositorio y pruebas de mapeo.
2. Introducir `ALIMENTACION_FORMAT_TEMPLATE_VERSION` y persistirla en cada emision nueva.
3. Cambiar la reutilizacion para comparar versiones y retirar los cortes temporales de plantilla.
4. Convertir la ausencia del membrete en un error de generacion y agregar validacion de imagen Docker.
5. Agregar pruebas unitarias e integradas indicadas en esta especificacion.
6. Desplegar solo API, validar una reemision legacy y documentar la version activa en las notas de la entrega.
