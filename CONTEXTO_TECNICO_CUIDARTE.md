# Contexto Tecnico Del Proyecto Cuidarte

Este documento registra las decisiones tecnologicas y metodologicas acordadas para el desarrollo del aplicativo web multi-tenant para Centros de Vida de Ancianos.

La intencion es que funcione como referencia viva del proyecto. Si el stack cambia, este archivo debe actualizarse en el mismo cambio donde se tome la nueva decision.

## Vision Del Producto

Cuidarte sera un aplicativo web multi-tenant para la gestion operativa de Centros de Vida de Ancianos.

El sistema tendra:

- BackOffice para usuarios SuperAdmin.
- Creacion y administracion de tenants.
- Configuracion por tenant.
- Dashboard de inicio con atajos.
- Modulo de Adultos Mayores.
- Modulo de Sesiones Grupales.
- Modulo de Registro de Alimentacion.
- Modulo de Gestion de Empleados.
- Sistema RBAC dinamico por tenant.
- Creacion de roles personalizados.
- Definicion de permisos.
- Asignacion de roles a empleados.
- Reportes y exportaciones.
- Auditoria de acciones sensibles.

## Principios De Arquitectura

- Mantener frontend y backend separados.
- Usar un monorepo pragmatico, no una arquitectura sobredimensionada.
- Priorizar seguridad multi-tenant desde la base de datos y desde el backend.
- Evitar JavaScript plano como lenguaje principal de desarrollo.
- Usar TypeScript strict en todo el monorepo.
- Mantener modulos de dominio claros.
- No usar microservicios al inicio.
- Extraer paquetes compartidos solo cuando aporten reutilizacion real.
- Mantener una UI moderna, propia, accesible y no generica.

## Monorepo

Usaremos:

```txt
pnpm workspaces + Turborepo minimo
```

`pnpm workspaces` sera la base para manejar paquetes y dependencias internas.

Turborepo se usara como task runner y cache liviano para tareas como:

- `dev`
- `build`
- `lint`
- `test`
- `typecheck`

No se usara Turborepo como una arquitectura pesada ni se crearan paquetes innecesarios desde el dia uno.

### Estructura Inicial

```txt
cuidarte/
  apps/
    web/
    api/
  packages/
    config/
    contracts/
  package.json
  pnpm-workspace.yaml
  turbo.json
```

### Paquetes Iniciales

- `apps/web`: aplicacion frontend.
- `apps/api`: API backend.
- `packages/config`: configuraciones compartidas de TypeScript, ESLint y Prettier.
- `packages/contracts`: contratos compartidos, schemas Zod, tipos y cliente API generado.

### Paquetes Futuros Posibles

Estos paquetes solo se crearan cuando haya una necesidad real:

- `packages/ui`: design system compartido.
- `packages/db`: schema Drizzle compartido, si conviene separarlo del backend.

## TypeScript Strict

TypeScript strict sera obligatorio en:

- Frontend.
- Backend.
- Paquetes compartidos.

Configuracion base recomendada:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Ubicacion sugerida:

```txt
packages/config/tsconfig/base.json
```

Cada app debe extender esa configuracion.

Regla del proyecto:

```txt
No usar any salvo casos excepcionales, documentados y justificados.
```

## Frontend

### Stack Principal

- React.
- Vite.
- TypeScript.
- TypeScript strict.
- TanStack Router.
- TanStack Query.
- Zustand.
- React Hook Form.
- Zod.

### Justificacion

React y Vite permiten una aplicacion administrativa rapida, modular y mantenible. No se usara Next.js al inicio porque el producto no necesita SSR ni SEO publico; sera una aplicacion interna tipo dashboard.

TanStack Query manejara el server state, cache, invalidaciones, paginacion y mutaciones.

Zustand se usara solamente para estado global de UI o estado cliente realmente compartido.

React Hook Form y Zod se usaran para formularios tipados y validacion consistente.

## UI Y Design System

### Stack UI

- Tailwind CSS v4.
- shadcn/ui.
- Radix UI Primitives.
- CVA, `class-variance-authority`.
- Sonner.
- Apache ECharts.
- Phosphor Icons React.
- Motion for React.
- Atkinson Hyperlegible Next.

### Uso De shadcn/ui

Si usaremos shadcn/ui, pero no como identidad visual final.

Se usara como base tecnica editable para acelerar componentes accesibles y consistentes.

Los componentes copiados de shadcn/ui se personalizaran para Cuidarte y quedaran bajo control del proyecto.

Componentes iniciales esperados:

- Button.
- Input.
- Textarea.
- Select.
- Dialog.
- Sheet.
- DropdownMenu.
- Popover.
- Tooltip.
- Tabs.
- Table.
- Calendar.
- Command.
- Badge.
- Card.
- Form.

No se usara el look default de shadcn/ui como identidad del producto.

### Paleta Oficial

La UI debe usar estrictamente esta paleta como base:

```txt
Verde Cuidado:   #1D9E75
Verde Profundo:  #085041
Verde Suave:     #E1F5EE
Ambar Calido:    #FAEEDA
Neutros:         tonos controlados para sistema, bordes, fondos y texto auxiliar
```

### Direccion Visual

- UI actual, unica, moderna y fresca.
- No copiar estilos de proyectos anteriores.
- No usar una interfaz generica de dashboard.
- Accesibilidad como criterio base.
- Radio maximo recomendado en cards: 8px.
- Microinteracciones discretas.
- Uso sobrio del color principal.
- Acento ambar solo para destacar informacion o estados especiales.
- Alto contraste y excelente legibilidad.

### Tipografia

Tipografia principal:

```txt
Atkinson Hyperlegible Next
```

Se escoge por su legibilidad, personalidad sobria y enfoque accesible, adecuado para un sistema relacionado con cuidado social y poblacion mayor.

## Backend

### Stack Principal

- NestJS.
- Fastify como HTTP adapter.
- TypeScript.
- TypeScript strict.
- Node.js LTS.
- Zod para validacion.
- Swagger/OpenAPI con `@nestjs/swagger`.

### Justificacion

NestJS ofrece una estructura clara para un backend modular:

- Modules.
- Controllers.
- Services.
- Guards.
- Pipes.
- Interceptors.
- Filters.
- Dependency Injection.

Es una buena eleccion para mantener todo el stack en TypeScript y organizar bien los modulos del dominio.

Fastify se usara por rendimiento y menor overhead frente a Express.

## Base De Datos

### Stack De Datos

- PostgreSQL.
- Drizzle ORM.
- drizzle-kit.
- Row Level Security, RLS.
- Migraciones versionadas.
- Indices compuestos por `tenant_id`.

### Modelo Multi-Tenant

Estrategia recomendada:

```txt
Single database + shared schema + tenant_id + PostgreSQL Row Level Security
```

Esta estrategia permite:

- Escalar muchos tenants pequenos y medianos.
- Mantener costos operativos razonables.
- Simplificar migraciones.
- Facilitar reportes globales para SuperAdmin.
- Reforzar aislamiento con RLS en base de datos.

No se empezara con base de datos por tenant ni schema por tenant, salvo que en el futuro existan clientes enterprise con requerimientos contractuales fuertes.

### ORM

ORM elegido:

```txt
Drizzle ORM
```

Motivos:

- Excelente integracion con PostgreSQL.
- Tipado fuerte en TypeScript.
- Mas cercano a SQL.
- Mejor control para reportes y queries complejas.
- Buen encaje con RLS y politicas de PostgreSQL.
- Menos capa magica que otros ORMs.

## Seguridad, Auth Y RBAC

### Autenticacion

Stack recomendado:

- NestJS Passport.
- Cookies HttpOnly, Secure y SameSite para sesion web.
- Access token de corta duracion.
- Refresh token rotativo.
- Argon2id para hash de contrasenas.
- MFA para SuperAdmin y administradores de tenant.

### Decision De Producto Para Login

El flujo acordado para usuarios creados por administradores sera:

- El admin crea el usuario.
- El admin asigna una contrasena inicial.
- El usuario inicia sesion con correo y contrasena.
- No se fuerza cambio de contrasena en el primer inicio de sesion.
- El usuario podra cambiar su contrasena manualmente desde configuracion de sesion o perfil.
- El admin podra resetear la contrasena, pero nunca verla despues de guardarla.

Esta decision es menos estricta que una contrasena temporal con cambio obligatorio. Para reducir el riesgo, se aplicaran estas reglas:

- La contrasena nunca se guarda en texto plano.
- El hash se hara con Argon2id.
- El admin no podra consultar contrasenas existentes.
- Los resets de contrasena quedaran auditados.
- Los cambios manuales de contrasena del usuario quedaran auditados.
- El login tendra rate limiting y bloqueo temporal por intentos fallidos.
- Los errores de login seran genericos.
- La configuracion del usuario mostrara la opcion de cambiar contrasena cuando lo desee.

Campos sugeridos para el modelo de usuario:

```txt
password_hash
password_set_by_admin
password_changed_at
failed_login_attempts
locked_until
last_login_at
is_active
```

### Seguridad Web

- Helmet.
- CORS restrictivo.
- CSRF protection si se usa autenticacion basada en cookies.
- Rate limiting con `@nestjs/throttler`.
- Sesiones revocables.
- Auditoria de login, logout y acciones sensibles.
- Variables de entorno validadas con Zod.
- Separacion estricta entre autenticacion, autorizacion y resolucion de tenant.

### RBAC Dinamico

El sistema de permisos sera dinamico y por tenant.

Modelo conceptual:

```txt
permissions
roles
role_permissions
employees/users
employee_roles
tenant_memberships
audit_logs
```

Ejemplos de permisos:

```txt
adultos.read
adultos.create
adultos.update
adultos.delete
sesiones.read
sesiones.create
alimentacion.read
alimentacion.create
alimentacion.export
empleados.read
empleados.manage
roles.read
roles.manage
tenant.settings
backoffice.tenants.create
```

Implementacion:

- Guards personalizados en NestJS.
- Decorators tipo `@RequirePermissions(...)`.
- Policies de autorizacion en backend.
- UI condicionada por permisos, pero nunca como unica barrera.
- Validacion real siempre en backend.
- Refuerzo de aislamiento por `tenant_id` y RLS.

## Modulos Del Sistema

Modulos iniciales:

- BackOffice.
- Tenants.
- Auth.
- RBAC.
- Inicio/Dashboard.
- Adultos Mayores.
- Sesiones Grupales.
- Registro de Alimentacion.
- Gestion de Empleados.
- Reportes.
- Auditoria.
- Configuracion por tenant.

## Patrones Y Metodologias

### Backend

- Modular Monolith.
- Clean Architecture ligera.
- Vertical Slice Architecture.
- Domain-driven boundaries por modulo.
- Policy-based authorization.
- Database-first security para multi-tenancy con RLS.

### Frontend

- Feature-Sliced Design.
- Component Composition.
- Server state separado del client state.
- Formularios declarativos y validados con schemas.
- UI condicionada por permisos.

### Producto Y Equipo

- Testing Pyramid.
- CI/CD.
- Conventional Commits.
- Semantic Versioning.
- Code review obligatorio.
- Auditoria funcional desde el diseno.
- Observabilidad desde el inicio.

## Reportes Y Exportacion

### PDF

Tecnologia recomendada:

```txt
Playwright renderizando HTML a PDF
```

Motivos:

- Alta fidelidad visual.
- Permite reutilizar HTML/CSS.
- Buen control sobre plantillas de reportes.
- Ideal para reportes administrativos con branding.

### XLSX

Tecnologia recomendada:

```txt
ExcelJS
```

Motivos:

- Compatible con Node.js.
- Permite crear hojas, estilos, formulas simples y multiples pestanas.
- Adecuado para reportes de listados, sesiones, alimentacion y empleados.

### Exportaciones Pesadas

Para archivos grandes:

- BullMQ.
- Redis.
- Jobs en background.
- Descarga segura con URLs temporales.

## Background Jobs Y Cache

Stack:

- Redis.
- BullMQ.

Usos:

- Generacion de reportes.
- Exportaciones XLSX/PDF.
- Envio de emails.
- Tareas programadas.
- Cache selectivo para dashboards y catalogos.
- Invalidacion explicita por tenant.

## Emails Y Notificaciones

Stack recomendado:

- React Email.
- Resend, Amazon SES o proveedor SMTP transaccional.
- BullMQ para envio asincrono.
- Sonner para notificaciones internas del frontend.

## Testing

### Frontend

- Vitest.
- React Testing Library.
- MSW.
- Playwright para E2E.
- axe con Playwright para accesibilidad basica.

### Backend

- Vitest o Jest.
- Supertest para pruebas HTTP.
- Testcontainers para PostgreSQL y Redis.

Preferencia:

```txt
Vitest si queremos unificar tooling en frontend y backend.
Jest si el ecosistema NestJS del proyecto lo exige.
```

### Tests Prioritarios

- Aislamiento multi-tenant.
- RLS.
- RBAC dinamico.
- Login.
- Refresh token.
- Creacion de tenant.
- Creacion y asignacion de roles.
- CRUD critico por modulo.
- Exportacion PDF/XLSX.
- Flujos E2E principales.

## DevOps Y Herramientas

- pnpm.
- Turborepo minimo.
- Docker Compose.
- PostgreSQL local en Docker.
- Redis local en Docker.
- GitHub Actions o Azure DevOps.
- ESLint.
- Prettier.
- Husky.
- lint-staged.
- Commitlint.
- Conventional Commits.
- OpenAPI generado desde backend.
- Cliente tipado para frontend con Orval u openapi-typescript.

### Uso De Docker

Si usaremos Docker, pero de forma pragmatica.

Durante desarrollo local:

- Docker Compose se usara para PostgreSQL.
- Docker Compose se usara para Redis.
- La API NestJS correra en WSL/host.
- La web React/Vite correra en WSL/host.

No correremos web y API en contenedores durante el desarrollo inicial, porque eso agrega friccion a hot reload, logs y debugging.

Mas adelante, para despliegue, se agregaran Dockerfiles de produccion para:

- `apps/api`.
- `apps/web`.

Puertos locales definidos:

```txt
API:        http://localhost:3001
Web:        http://localhost:5173
PostgreSQL: localhost:5433
Redis:      localhost:6379
```

## Stack Final Resumido

```txt
React + Vite + TypeScript strict
NestJS + Fastify + TypeScript strict
PostgreSQL + Row Level Security
Drizzle ORM + drizzle-kit
Zod
TanStack Router + TanStack Query
Zustand
React Hook Form
Tailwind CSS v4 + shadcn/ui + Radix UI + CVA
Sonner + Apache ECharts + Phosphor Icons + Motion for React
Atkinson Hyperlegible Next
Redis + BullMQ
Playwright + Vitest + React Testing Library + Testcontainers
pnpm workspaces + Turborepo minimo
Docker Compose + OpenAPI
```

## Decisiones Explicitas

- No usar ASP.NET para este proyecto.
- No usar JavaScript plano como lenguaje de desarrollo principal.
- No usar Next.js al inicio.
- No usar microservicios al inicio.
- No usar Nx al inicio.
- No usar Prisma como ORM principal.
- No usar shadcn/ui como identidad visual final.
- Si usar shadcn/ui como base editable de componentes.
- Si usar TypeScript strict en todo el monorepo.
- Si usar pnpm workspaces.
- Si usar Turborepo, pero en modo minimo y pragmatico.
