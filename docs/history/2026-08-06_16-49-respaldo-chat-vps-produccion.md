# Respaldo de conversación — VPS y producción

Fecha y hora del respaldo: 2026-08-06 16:49

## Contexto

La conversación trató sobre dejar una VPS Ubuntu lista para producción en AWS, usando el proyecto `cuidarte` ya clonado en el servidor.

## Resumen de lo conversado

### 1. Acceso inicial a la VPS

- Se explicó cómo conectar por SSH usando el archivo `.pem` provisto por AWS.
- Se confirmó que la instancia usa el usuario `ubuntu`.
- La conexión quedó establecida correctamente.

### 2. Primeros pasos sugeridos para producción

Se propusieron acciones generales sin tocar código:

- actualizar el sistema con `apt update` y `apt upgrade`;
- instalar herramientas base como `git`, `curl`, `ufw` y `fail2ban`;
- crear un usuario de despliegue separado;
- configurar firewall para SSH, HTTP y HTTPS;
- decidir si la aplicación correría con Docker o con Node directo;
- instalar Docker o Node según la estrategia elegida;
- apuntar el dominio a la IP pública;
- usar Nginx como reverse proxy;
- activar HTTPS con Let’s Encrypt;
- dejar reinicio automático y backups.

### 3. Confirmación del archivo `.pem`

- Se aclaró que el archivo `.pem` permite conectarse por SSH.
- Se recomendó usar permisos `chmod 400` para la llave privada.

### 4. Estado del proyecto en la VPS

Luego de confirmar que el proyecto ya estaba clonado, se inspeccionó la estructura del repositorio.

Se detectó:

- monorepo con `pnpm` y Turborepo;
- `docker-compose.vps.yml` para producción;
- `apps/api` como backend NestJS;
- `apps/web` como frontend Vite;
- una plantilla de variables de entorno para VPS en `.env.vps.example`.

### 5. Hallazgos sobre producción

Se revisaron archivos relevantes:

- `package.json`
- `docker-compose.vps.yml`
- `docker-compose.yml`
- `apps/api/package.json`
- `apps/api/src/config/env.ts`
- `README.md`
- `.env.vps.example`

Conclusiones principales:

- En producción se usa Docker Compose.
- La API se expone solo en `127.0.0.1:3001`.
- PostgreSQL y Redis corren en contenedores.
- Los archivos subidos se montan en `/var/lib/cuidarte/uploads`.
- La API requiere variables como `CUIDARTE_API_IMAGE`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `PORT`, `WEB_ORIGIN`, `SESSION_COOKIE_NAME` y `SESSION_TTL_DAYS`.

### 6. Recomendación para el archivo `.env.vps`

Se indicó que el archivo de producción no debería conservar valores de desarrollo como:

- `DATABASE_URL=...@localhost:15432/...`
- `WEB_ORIGIN=http://localhost:5173`
- `SEED_PASSWORD=Cuidarte123!`
- variables que no estén contempladas por la configuración de producción.

Se sugirió dejar el archivo con una forma similar a esta:

```env
CUIDARTE_API_IMAGE=TU_IMAGEN_PUBLICADA
POSTGRES_PASSWORD=UNA_CLAVE_LARGA_Y_SEGURA
DATABASE_URL=postgres://cuidarte:UNA_CLAVE_LARGA_Y_SEGURA@postgres:5432/cuidarte
PORT=3001
WEB_ORIGIN=https://TU_DOMINIO_O_FRONTEND_REAL
SESSION_COOKIE_NAME=cuidarte_session
SESSION_TTL_DAYS=7
```

También se comentó que, si no hay dominio todavía, `WEB_ORIGIN` puede apuntar temporalmente a la IP pública.

## Resultado actual

- La VPS ya está accesible por SSH.
- El proyecto ya está clonado.
- Se identificó el flujo de producción basado en Docker.
- Se dejó pendiente completar el archivo `.env.vps` con credenciales reales y levantar la infraestructura.

