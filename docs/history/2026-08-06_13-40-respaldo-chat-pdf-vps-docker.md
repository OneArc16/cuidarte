# Respaldo de conversacion - 2026-08-06 13:40

## Contexto

Conversacion sobre desplegar el proyecto en produccion en una VPS de Lightsail, usando Docker, y guardar documentos PDF en una carpeta local persistente de la VPS para que otros usuarios autorizados puedan descargarlos despues.

## Puntos tratados

1. Se confirmo que si, Docker se puede montar en la VPS.
2. Se recomendo guardar los PDFs en una carpeta persistente del host, no dentro del contenedor.
3. Se sugirio usar una ruta tipo `/var/lib/cuidarte/uploads`.
4. Se aclaro que la descarga debe pasar por la API con autenticacion y permisos.
5. Se indico que si se suben varios archivos no hay problema si se usan nombres unicos y metadata en base de datos.
6. Se remarco que no se debe usar `/tmp` ni exponer la carpeta de archivos como publica.
7. Se recomendo montar el volumen del host en Docker, por ejemplo:

```yaml
services:
  api:
    volumes:
      - /var/lib/cuidarte/uploads:/data/uploads
```

## Plan resumido acordado

1. Docker corre en la VPS.
2. Los PDFs se guardan en almacenamiento local persistente.
3. La API controla subida y descarga.
4. La base de datos guarda metadata del archivo.
5. Se deben agregar limites, validacion de PDF y backups.
6. Si el sistema crece, se puede migrar luego a almacenamiento tipo S3.

## Documento creado a partir de esta conversacion

Se dejo tambien una especificacion tecnica en:

- `docs/specs/2026-08-06-pdf-vps-docker-storage.spec.md`

## Observacion final

La prioridad operativa para produccion quedo definida como:

1. volumen persistente en la VPS;
2. descarga autenticada desde API;
3. nombres internos unicos;
4. pruebas para verificar persistencia real despues de reinicios o redeploys.
