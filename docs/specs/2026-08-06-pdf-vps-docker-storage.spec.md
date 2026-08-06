# SPEC: Guardado y Descarga de PDFs en VPS con Docker

- Estado: proposed
- Fecha: 2026-08-06
- Modulo: `documentos`
- Fase: almacenamiento persistente de PDFs en VPS y descarga controlada

## 1. Objetivo de la fase

Permitir que los usuarios suban documentos PDF y que otros usuarios autorizados puedan descargarlos despues, garantizando que:

1. los archivos sobrevivan reinicios, redeploys y recreaciones de contenedores;
2. el almacenamiento quede en una carpeta persistente de la VPS, no en el filesystem temporal del contenedor;
3. las descargas se sirvan desde la API con control de autenticacion y permisos;
4. se pueda verificar con pruebas que el PDF quedo guardado fisicamente en la VPS.

## 2. Opinion experta (critica, no complaciente)

1. **No recomiendo guardar PDFs dentro del contenedor.**
Si el contenedor se recrea, el archivo puede perderse.
2. **No recomiendo exponer la carpeta de uploads como contenido publico.**
La descarga debe pasar por la API para mantener control de acceso y trazabilidad.
3. **No recomiendo usar `/tmp` en produccion.**
Es una ruta util para desarrollo, pero no para persistencia real.
4. **No recomiendo depender del nombre original del archivo como identificador.**
Debe usarse un nombre interno unico para evitar sobreescrituras.
5. **No recomiendo dejar ilimitada la subida de archivos.**
Se necesitan limites por archivo, por request y por capacidad total del disco.

## 3. Problema de negocio

El sistema debe soportar subida de uno o varios PDFs por registro, y despues permitir su descarga por usuarios autorizados.

Riesgos principales:

1. perdida de archivos si se despliega de nuevo la aplicacion;
2. colision de nombres si dos usuarios suben archivos iguales;
3. crecimiento descontrolado del disco si no hay limites;
4. acceso no autorizado si los archivos quedan publicos;
5. falta de trazabilidad si no se guarda metadata del archivo.

## 4. Alcance funcional

1. Subida de uno o mas PDFs desde la API.
2. Persistencia de los archivos en una carpeta local de la VPS.
3. Registro en base de datos de la metadata del archivo.
4. Descarga autorizada desde endpoint de la API.
5. Verificacion funcional de que el archivo existe en disco despues de subirlo.
6. Soporte para multiples archivos asociados a una misma entidad de negocio.

## 5. Recomendacion de arquitectura

La solucion recomendada tiene cuatro capas:

1. **API**
- recibe la subida;
- valida autenticacion, permisos y contenido;
- escribe el archivo en disco;
- registra metadata en base de datos;
- sirve la descarga.

2. **Volumen persistente en la VPS**
- almacena los PDFs fuera del contenedor;
- sobrevive reinicios y redeploys.

3. **Docker Compose**
- monta la carpeta del host dentro del contenedor de API;
- mantiene el codigo desacoplado del storage fisico.

4. **Base de datos**
- guarda la referencia logica del archivo;
- no guarda el binario del PDF.

## 6. Estructura de almacenamiento recomendada

Ruta recomendada en la VPS:

`/var/lib/cuidarte/uploads`

Convencion interna:

`/var/lib/cuidarte/uploads/<tenantId>/<module>/<entityId>/<uuid>.pdf`

Reglas:

1. cada archivo debe tener nombre interno unico;
2. el nombre original solo se conserva como metadata;
3. la estructura por `tenantId` evita mezcla de datos entre sedes;
4. la estructura por modulo y entidad facilita auditoria y limpieza;
5. las rutas deben validarse contra path traversal.

## 7. Contrato de metadata

Cada PDF guardado debe registrar como minimo:

- `id`
- `tenantId`
- `module`
- `entityId`
- `originalName`
- `storedName`
- `relativePath`
- `mimeType`
- `sizeBytes`
- `checksum` o hash opcional
- `uploadedByUserId`
- `createdAt`
- `updatedAt`

## 8. Flujo de subida

1. El usuario envia uno o mas PDFs.
2. La API valida:
- sesion activa;
- permisos de subida;
- limite de cantidad;
- limite de peso por archivo;
- tipo MIME permitido;
- contenido real compatible con PDF.
3. La API genera un nombre interno unico.
4. La API escribe el archivo en la ruta persistente.
5. La API registra la metadata en base de datos.
6. La API responde con el resumen de archivos guardados.

## 9. Flujo de descarga

1. El usuario solicita el archivo por identificador.
2. La API valida autenticacion y permisos de lectura.
3. La API busca la metadata en base de datos.
4. La API confirma que el archivo existe en disco.
5. La API responde el PDF con `Content-Type: application/pdf`.
6. La API puede responder como `attachment` para forzar descarga.

## 10. Soporte para multiples archivos

Si una entidad puede tener mas de un PDF, la regla recomendada es:

1. una entidad puede tener relacion `1 a N` con documentos;
2. cada archivo se guarda como fila independiente;
3. no se sobrescriben archivos previos;
4. si se suben varios archivos en una sola operacion, el proceso debe ser transaccional a nivel logico;
5. si un archivo falla, el sistema debe dejar evidencia clara de que no se completo toda la operacion.

## 11. Recomendacion de Docker en VPS

Si, Docker se puede montar en la VPS sin problema y es una buena decision para este caso.

Configuracion recomendada:

1. la app corre en contenedores;
2. la carpeta `/var/lib/cuidarte/uploads` vive en el host;
3. esa carpeta se monta en el contenedor de API como volumen;
4. la base de datos y Redis no deben quedar expuestos publicamente;
5. los archivos nunca deben depender del filesystem interno del contenedor.

Ejemplo conceptual:

```yaml
services:
  api:
    volumes:
      - /var/lib/cuidarte/uploads:/data/uploads
```

La API debe usar `/data/uploads` como ruta interna y resolver todo contra ese volumen.

## 12. Reglas de seguridad

1. Autenticacion obligatoria para subir y descargar.
2. Autorizacion por tenant, modulo y entidad.
3. Validacion real de PDF, no solo extension.
4. Limite maximo por archivo.
5. Limite maximo por request.
6. No exponer la carpeta de archivos como ruta publica.
7. Permisos de archivo restrictivos en el host.
8. Sanitizacion de nombres y rutas.
9. Auditoria de subida y descarga.

## 13. Reglas de operacion

1. La carpeta de uploads debe existir antes de levantar la API.
2. El usuario del proceso debe tener permiso de escritura solo donde corresponde.
3. Debe existir monitoreo de disco libre en la VPS.
4. Deben ejecutarse backups periodicos de la carpeta de uploads.
5. El backup debe ser verificable con una restauracion de prueba.

## 14. Cambios tecnicos recomendados

## 14.1 API

1. Reutilizar el storage local actual como base para PDF, pero apuntarlo a la ruta persistente de produccion.
2. Crear o ajustar un servicio de documentos que:
- escriba archivos en disco;
- lea archivos para descarga;
- valide existencia antes de servir.
3. Crear validaciones especificas para PDF.
4. Guardar metadata en base de datos.
5. Exponer endpoints de subida y descarga autenticados.

## 14.2 Docker

1. Agregar volumen persistente para uploads.
2. Asegurar que los contenedores se puedan recrear sin perder archivos.
3. No publicar puertos de servicios internos que no deban ser publicos.

## 14.3 Infraestructura

1. Crear la carpeta persistente en la VPS.
2. Definir permisos de sistema.
3. Configurar backup externo.
4. Verificar espacio libre y crecimiento esperado.

## 15. Estrategia de pruebas

## 15.1 Pruebas funcionales

1. Subir un PDF de prueba.
2. Confirmar que aparece en base de datos.
3. Confirmar que existe fisicamente en la VPS.
4. Descargar el archivo y validar que abre correctamente.
5. Subir dos o mas archivos en una sola operacion.
6. Confirmar que ninguno se sobreescribe.
7. Reiniciar el contenedor y validar que los PDFs siguen disponibles.

## 15.2 Pruebas de regresion

1. Intentar subir un archivo no PDF.
2. Intentar subir un archivo que supere el peso maximo.
3. Intentar descargar un archivo sin permisos.
4. Intentar descargar un archivo borrado o inexistente.
5. Intentar subir dos archivos con el mismo nombre original.

## 15.3 Criterio de verificacion fisica

La prueba no se considera aprobada solo porque la API responda 200.

Tambien debe comprobarse:

1. que el archivo exista en `/var/lib/cuidarte/uploads`;
2. que el nombre interno sea unico;
3. que la ruta almacenada en base de datos coincida con el archivo real;
4. que el archivo sobreviva a recreacion del contenedor.

## 16. Errores esperados y respuesta

1. `400`: tipo de archivo invalido, archivo demasiado grande o request invalida.
2. `401`: usuario no autenticado.
3. `403`: usuario sin permisos.
4. `404`: documento no encontrado.
5. `409`: colision logica de subida si se intenta duplicar una referencia prohibida.
6. `413`: payload demasiado grande.
7. `500`: error de filesystem o escritura en disco.

## 17. Criterios de aceptacion (DoD)

1. Se pueden subir PDFs a la API.
2. El archivo queda guardado en una carpeta persistente de la VPS.
3. El archivo sigue existiendo despues de reiniciar o recrear el contenedor.
4. Los usuarios autorizados pueden descargar el PDF.
5. Los usuarios sin permiso no pueden acceder al archivo.
6. Se soporta mas de un archivo por entidad sin sobrescritura.
7. La metadata queda registrada en base de datos.
8. Se cuenta con pruebas funcionales que verifican guardado fisico y descarga.

## 18. Riesgos y mitigacion

1. Riesgo: llenado del disco de la VPS.
Mitigacion: limites, monitoreo y limpieza controlada.
2. Riesgo: archivos inaccesibles tras despliegues.
Mitigacion: volumen persistente montado desde host.
3. Riesgo: permisos incorrectos sobre la carpeta.
Mitigacion: crear usuario y permisos de sistema correctos antes de desplegar.
4. Riesgo: archivos publicos sin control.
Mitigacion: descarga solo por API autenticada.
5. Riesgo: validacion debil de PDF.
Mitigacion: revisar MIME, extension y contenido real.

## 19. Decision cerrada

1. El almacenamiento final de PDFs sera local en la VPS.
2. La persistencia se resolvera con volumen Docker montado desde el host.
3. La descarga sera controlada por la API.
4. Los archivos se identificaran con nombre interno unico.
5. Se incluiran pruebas para verificar guardado fisico y supervivencia a reinicios.

## 20. Plan de ejecucion recomendado

1. **Paso 1 - Storage**
- definir ruta persistente y volumen Docker.
2. **Paso 2 - API**
- implementar subida, validacion, guardado y descarga.
3. **Paso 3 - Metadata**
- persistir referencias en base de datos.
4. **Paso 4 - Seguridad**
- permisos, autenticacion y autorizacion.
5. **Paso 5 - QA**
- probar guardado fisico, descarga y reinicio del contenedor.
