# SPEC: Indicador de Atenciones de Enfermeria en el Home

- Estado: proposed
- Fecha: 2026-08-17
- Tipo: implementation-spec
- Modulos impactados: `home`, `atenciones-enfermeria`
- Paquetes impactados: `packages/contracts`, `apps/api`, `apps/web`
- Base de datos: sin migracion

## 1. Objetivo

Agregar al resumen operativo del home un indicador llamado `Atenciones de enfermeria` que muestre
el numero total de atenciones registradas en `atenciones_enfermeria` dentro del alcance autorizado
del usuario.

El cambio debe conservar el aislamiento por tenant, reutilizar las politicas existentes, mantener
el contrato API como fuente de verdad y permitir navegar desde la tarjeta al modulo de enfermeria.

## 2. Resultado funcional esperado

1. El dashboard muestra una tarjeta `Atenciones de enfermeria`.
2. Cada fila de `atenciones_enfermeria` cuenta como una atencion.
3. El total es historico y acumulado; no depende de la fecha de atencion, fecha de creacion, tipo
   de cuidado, profesional ni adulto mayor.
4. `admin`, `auditor` y `director` ven solamente el total de su tenant.
5. `super_admin` ve el total global de todos los tenants.
6. El valor `0` se muestra como `0`; la tarjeta no se oculta cuando no existen registros.
7. Al activar la tarjeta se navega a `/atenciones-enfermeria`.
8. La tarjeta mantiene el comportamiento accesible y adaptable de los indicadores existentes.
9. Los roles que no tienen acceso al dashboard continúan sin solicitar `GET /home/dashboard`.

## 3. Definicion exacta de la metrica

### 3.1 Formula

Para alcance por tenant:

```sql
select count(*)::int
from atenciones_enfermeria
where tenant_id = :actorTenantId;
```

Para alcance global:

```sql
select count(*)::int
from atenciones_enfermeria;
```

La respuesta se representa con el identificador estable:

```ts
{
  id: "atenciones_enfermeria",
  total: number,
}
```

### 3.2 Incluye

1. Todas las filas vigentes de `atenciones_enfermeria` dentro del alcance resuelto.
2. Atenciones de cualquier `careType`.
3. Atenciones creadas por cualquier profesional de enfermeria del tenant.
4. Registros con cualquier fecha historica o futura admitida por el dominio actual.

### 3.3 No incluye

1. Atenciones medicas de `atenciones_individuales`.
2. Atenciones historicas creadas con rol `enfermeria` que permanecen en
   `atenciones_individuales`.
3. Personas atendidas unicas: dos atenciones del mismo adulto cuentan como dos.
4. Mediciones individuales: una atencion con varios signos vitales cuenta como una.

No existe eliminacion ni borrado logico para `atenciones_enfermeria` en el alcance actual. Si esa
regla cambia en el futuro, el indicador debera contar solamente registros activos y este spec
debera actualizarse.

## 4. Matriz de autorizacion y alcance

| Rol           | Ver dashboard | Ver indicador | Alcance del conteo | Abrir enfermeria                            |
| ------------- | ------------- | ------------- | ------------------ | ------------------------------------------- |
| `super_admin` | Si            | Si            | Global             | Si                                          |
| `admin`       | Si            | Si            | Su tenant          | Si                                          |
| `auditor`     | Si            | Si            | Su tenant          | Si                                          |
| `director`    | Si            | Si            | Su tenant          | Si                                          |
| `enfermeria`  | No            | No            | No aplica          | Si, acceso directo existente                |
| `medico`      | No            | No            | No aplica          | Sin cambio respecto a las reglas existentes |
| Otros roles   | No            | No            | No aplica          | Sin cambio                                  |

Reglas obligatorias:

1. La API es la fuente de verdad del total y del alcance.
2. La web no calcula totales a partir de listados paginados.
3. La web no envia `tenantId` para decidir el alcance del indicador.
4. El backend obtiene el actor desde la sesion y reutiliza
   `resolveAtencionEnfermeriaScope`.
5. Un actor con alcance de tenant pero sin `tenantId` no puede producir un conteo global por
   omision.
6. No se amplian `homeDashboardAccessRoleValues` ni `atencionEnfermeriaModuleRoleValues`.

## 5. Decisiones de arquitectura

### 5.1 Contrato compartido

En `packages/contracts/src/home.ts`:

1. agregar `atenciones_enfermeria` a `homeDashboardIndicatorIdValues`;
2. conservar `homeDashboardIndicatorSchema` y `homeDashboardResponseSchema` sin campos nuevos;
3. no agregar `atenciones-enfermeria` a `homeDashboardShortcutModuleIdValues`.

El indicador es una metrica del dashboard, no un nuevo acceso principal. Mantener separados los
identificadores de indicadores y los identificadores de accesos evita que el contrato de la API
adquiera una excepcion motivada solamente por la navegacion de React.

### 5.2 API NestJS

La implementacion permanece en `HomeService`, siguiendo el patron actual de agregacion del home:

1. importar la tabla `atencionesEnfermeria` desde el schema;
2. resolver el alcance mediante `resolveAtencionEnfermeriaScope(actor)`;
3. ejecutar el conteo en el mismo `Promise.all` de las consultas independientes del dashboard;
4. agregar el resultado a `indicatorTotals.atenciones_enfermeria`, incluso cuando sea `0`;
5. dejar que `buildIndicators` preserve el orden definido por el contrato;
6. validar la respuesta final con `homeDashboardResponseSchema`.

No se modifica `HomeController`: su guard, roles, endpoint y schema de salida ya son adecuados.

No se crea un repositorio nuevo exclusivamente para este conteo. El home ya funciona como una
proyeccion de lectura que agrega varias tablas mediante `DatabaseService`; introducir una
abstraccion aislada para una unica consulta aumentaria complejidad sin establecer una frontera
coherente. Una extraccion general de repositorio para todo el dashboard queda fuera de alcance.

### 5.3 Persistencia y rendimiento

1. Usar `count(*)::int`; no cargar filas ni identificadores en memoria.
2. Aplicar la condicion de tenant en SQL, nunca despues de consultar.
3. El indice existente `atenciones_enfermeria_tenant_date_idx` puede resolver busquedas por su
   prefijo `tenant_id`; no se requiere una migracion para este cambio.
4. El conteo global puede requerir un recorrido de la tabla, comportamiento aceptable para el
   volumen y la semantica exacta actuales del dashboard.
5. No agregar cache, tabla de acumulados ni contador mutable prematuramente. Si las mediciones de
   produccion muestran degradacion, se disenara una estrategia de agregacion con invalidacion
   explicita en un spec independiente.
6. Una falla de la consulta no debe convertirse silenciosamente en `0`: debe conservar el manejo
   de error actual del endpoint para no presentar datos incorrectos como validos.

### 5.4 Web React

En `home-dashboard-definitions.ts`:

1. agregar la definicion `atenciones_enfermeria`;
2. usar la etiqueta `Atenciones de enfermeria`;
3. usar el icono `HeartPulse` y un tono disponible en el sistema visual existente;
4. ubicarla inmediatamente despues de `Adultos registrados` para agrupar las metricas clinicas
   principales.

La propiedad de destino no debe continuar limitada a `HomeDashboardShortcutModuleId`, porque el
modulo de enfermeria existe en `HOME_MODULES` pero deliberadamente no es un shortcut del dashboard.
La web debe:

1. introducir un tipo local de destino basado en `HomeModuleId`, excluyendo `inicio`;
2. resolver la ruta contra `HOME_MODULES`;
3. mantener el `navigate` existente y no usar `window.location`;
4. no duplicar el literal `/atenciones-enfermeria` en el componente;
5. no agregar una segunda consulta ni derivar el total desde el listado de enfermeria.

No se requieren estilos nuevos: la grilla usa `auto-fit`, la tarjeta reutiliza
`HomeDashboardIndicatorCard` y el icono ya pertenece a `lucide-react`. Solo se modificara CSS si
una prueba visual demuestra una regresion real en los breakpoints existentes.

### 5.5 Monorepo

1. `apps/api` y `apps/web` consumen el identificador desde `@cuidarte/contracts`.
2. Ninguna app importa archivos internos de otra app.
3. No se agregan paquetes ni dependencias.
4. No se agregan scripts root ni se modifica `turbo.json`.
5. Las verificaciones se ejecutan mediante los scripts de cada paquete o `turbo run` desde la
   raiz, respetando el grafo de dependencias.

## 6. Flujo de datos

```txt
Usuario abre Inicio
        |
        v
React Query solicita GET /home/dashboard
        |
        v
SessionGuard + RolesGuard validan acceso al dashboard
        |
        v
HomeService resuelve alcance de enfermeria
        |
        +--- super_admin ---> count(*) global
        |
        +--- admin/auditor/director ---> count(*) where tenant_id = actor.tenantId
        |
        v
homeDashboardResponseSchema valida la respuesta
        |
        v
React renderiza Atenciones de enfermeria
        |
        v
Click/Enter/Espacio navega a /atenciones-enfermeria
```

## 7. Cambios por archivo

### 7.1 Contratos

`packages/contracts/src/home.ts`

- agregar `atenciones_enfermeria` a la lista ordenada de indicadores;
- mantener inferencia Zod y tipos derivados.

### 7.2 API

`apps/api/src/modules/home/home.service.ts`

- importar tabla y policy de enfermeria;
- resolver el alcance;
- contar en paralelo;
- publicar el indicador.

`apps/api/src/modules/home/home.service.test.ts`

- actualizar stubs y expectativas;
- cubrir alcance global, tenant y valor cero;
- conservar la prueba de ausencia de `.where(undefined)`.

No se esperan cambios en controller, module, schema Drizzle ni migraciones.

### 7.3 Web

`apps/web/src/features/home/lib/home-dashboard-definitions.ts`

- agregar etiqueta, icono, tono y destino;
- ampliar solamente el tipo local de destino navegable.

`apps/web/src/features/home/components/home-dashboard.tsx`

- resolver destinos desde todos los modulos navegables del home;
- conservar filtrado por indicadores presentes en la respuesta.

`apps/web/src/test/fixtures/home.fixtures.ts`

- agregar un total determinista de atenciones de enfermeria.

`apps/web/src/app/__tests__/home-dashboard.test.tsx`

- verificar renderizado y valor;
- verificar navegacion al activar la tarjeta;
- conservar la ausencia del dashboard para roles profesionales.

El handler MSW no requiere logica nueva porque ya devuelve el fixture completo. Se modificara
solo si el tipado o una prueba lo exige.

## 8. Estrategia de pruebas

### 8.1 API

Casos obligatorios:

1. `super_admin` obtiene el total global y el indicador aparece en la posicion esperada.
2. `admin`, `auditor` o `director` usan `{ type: "tenant", tenantId }`.
3. El conteo de otro tenant no puede incorporarse al resultado del actor.
4. Un total `0` produce `{ id: "atenciones_enfermeria", total: 0 }`.
5. El servicio sigue rechazando roles sin acceso al dashboard.
6. El camino global no invoca `.where(undefined)`.
7. Una falla de base de datos se propaga; no se representa como cero.

Los tests no deben limitarse a comprobar un stub con el numero esperado: al menos un caso debe
inspeccionar la condicion o el scope entregado al conteo para prevenir una fuga multi-tenant.

### 8.2 Web

Casos obligatorios:

1. La region `Resumen operativo` contiene un boton accesible llamado
   `Atenciones de enfermeria`.
2. La tarjeta muestra el total formateado con `Intl.NumberFormat("es-CO")`.
3. El total `0` permanece visible.
4. Activar la tarjeta navega a `/atenciones-enfermeria` y renderiza el modulo.
5. Los roles del dashboard autorizados ven la tarjeta.
6. `enfermeria` y otros roles profesionales continúan sin solicitar el endpoint del dashboard.
7. No se introduce una solicitud adicional al endpoint paginado de atenciones.

### 8.3 Regresion

1. Los diez indicadores existentes conservan sus identificadores, valores y destinos.
2. Los shortcuts existentes no cambian de orden ni semantica.
3. BackOffice sigue visible solo para `super_admin`.
4. El error del dashboard mantiene el mensaje existente y no bloquea los accesos disponibles.

## 9. Puertas de calidad

Ejecutar desde la raiz del repositorio:

```bash
pnpm --filter @cuidarte/contracts build
pnpm --filter @cuidarte/api exec node --import tsx --test src/modules/home/home.service.test.ts src/modules/home/home.controller.test.ts src/modules/home/home.policy.test.ts
pnpm --filter @cuidarte/web exec vitest run src/app/__tests__/home-dashboard.test.tsx --reporter=dot
pnpm turbo run typecheck --filter=@cuidarte/contracts --filter=@cuidarte/api --filter=@cuidarte/web
pnpm turbo run build --filter=@cuidarte/api --filter=@cuidarte/web
```

Si una falla preexistente ajena al alcance impide una puerta global, registrar el comando, error y
evidencia de que las pruebas focalizadas del cambio si pasan. No ocultar ni modificar pruebas
ajenas para obtener una ejecucion verde.

## 10. Criterios de aceptacion

- [ ] Existe `atenciones_enfermeria` en el contrato de indicadores del home.
- [ ] El indicador cuenta filas de `atenciones_enfermeria`, no personas ni mediciones.
- [ ] `super_admin` recibe el total global.
- [ ] `admin`, `auditor` y `director` reciben exclusivamente el total de su tenant.
- [ ] Un total cero se incluye y se muestra.
- [ ] La tarjeta se llama `Atenciones de enfermeria`.
- [ ] La tarjeta navega al modulo de enfermeria.
- [ ] No se altera la lista contractual de shortcuts.
- [ ] No se amplian roles ni permisos existentes.
- [ ] No se crea migracion de base de datos.
- [ ] No se agregan consultas secuenciales evitables al dashboard.
- [ ] Las pruebas focalizadas de API y web pasan.
- [ ] Typecheck y build del alcance pasan o documentan fallas preexistentes verificables.

## 11. Fuera de alcance

1. Indicadores por dia, mes, profesional, tipo de cuidado o adulto mayor.
2. Conteo de adultos unicos atendidos.
3. Mezclar atenciones de enfermeria con atenciones medicas.
4. Graficas, tendencias, metas o comparaciones temporales.
5. Filtros interactivos en el home.
6. Cache distribuido, vistas materializadas o tablas de acumulados.
7. Crear un shortcut adicional del modulo de enfermeria en `Módulos del sistema`.
8. Cambiar permisos del dashboard o del modulo de enfermeria.
9. Cambios de schema, indices o migraciones.
10. Refactor general del servicio de home.

## 12. Riesgos y mitigaciones

| Riesgo                                              | Mitigacion                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Fuga de datos entre tenants                         | Resolver alcance desde la sesion, filtrar en SQL y probar la condicion |
| Contar historicos medicos como enfermeria           | Consultar exclusivamente `atenciones_enfermeria`                       |
| Ocultar la tarjeta cuando el total es cero          | Asignar siempre el total y distinguir `0` de `undefined`               |
| Romper el tipado de shortcuts al agregar el destino | Usar un tipo local de modulo navegable; no alterar shortcut IDs        |
| Incrementar la latencia del dashboard               | Ejecutar el conteo dentro del `Promise.all` existente                  |
| Mostrar un cero falso ante un error                 | Propagar la falla y conservar el estado de error del dashboard         |
| Crear deuda por sobrearquitectura                   | Mantener el patron actual del home y excluir refactors generales       |

## 13. Plan de implementacion

### Paso 1: Contrato y API

- [ ] Agregar el identificador contractual.
- [ ] Incorporar el conteo con alcance global/tenant.
- [ ] Actualizar pruebas unitarias del home API.
- [ ] Ejecutar build de contratos y pruebas focalizadas de API.

### Paso 2: Presentacion y navegacion

- [ ] Agregar la definicion visual del indicador.
- [ ] Generalizar de forma local la resolucion del destino navegable.
- [ ] Actualizar fixture y pruebas del dashboard.
- [ ] Ejecutar pruebas focalizadas de web.

### Paso 3: Verificacion integral

- [ ] Ejecutar typecheck de contratos, API y web.
- [ ] Ejecutar build de API y web.
- [ ] Revisar el diff para confirmar que no hay migraciones, permisos ni cambios ajenos.
- [ ] Actualizar este spec a `completed` y registrar resultados.

## 14. Registro de implementacion

Completar durante la implementacion:

| Fecha     | Paso | Archivos | Verificacion | Resultado/decisiones |
| --------- | ---- | -------- | ------------ | -------------------- |
| Pendiente | -    | -        | -            | -                    |
