# SPEC: Firmante Activo del Centro para Formatos de Alimentacion

- Estado: proposed
- Fecha: 2026-08-09
- Modulos:
  - `empleados`
  - `registro-alimentacion`
  - `tenant-branding`
- Fase: simplificacion del modelo de firma del director para PDF de alimentacion
- Complementa:
  - `docs/specs/alimentacion-firma-director-historica.spec.md`
  - `docs/specs/2026-07-22-logo-centro-vida-formatos-alimentacion.spec.md`
  - `docs/specs/2026-08-09-alimentacion-formato-entrega-diligenciamiento-visitas.spec.md`

## 1. Objetivo

Reemplazar el modelo operativo actual basado en `vigencias por fecha` para la firma del director en el PDF de alimentacion por un modelo mas simple, estable y auditable:

1. cada centro puede tener uno o varios directores;
2. cada director puede tener una o varias versiones de firma;
3. cada centro tiene un unico `firmante activo` a la vez;
4. todo PDF nuevo usa siempre el firmante activo actual del centro;
5. los PDF ya emitidos conservan su snapshot historico y no se recalculan;
6. la operacion diaria deja de depender de fechas de vigencia manuales.

## 2. Opinion experta

1. **No recomiendo seguir usando vigencias por fecha como regla operativa principal.**
En este flujo la vigencia agrega complejidad, ambiguedad y errores de soporte sin aportar suficiente valor operativo.

2. **No recomiendo asumir que la ultima firma subida debe usarse automaticamente.**
Subir archivo y activar firmante son decisiones distintas. El sistema debe mantener control explicito.

3. **No recomiendo permitir dos firmantes activos simultaneos por centro.**
Si existen dos directores en un mismo centro, ambos pueden coexistir, pero el PDF debe tener una sola fuente de verdad para firma.

4. **No recomiendo recalcular PDFs historicos contra el estado actual del centro.**
Cada emision debe seguir congelada con el director, firma y logo exactos usados al momento de emitir.

5. **No recomiendo esconder esta decision en heuristicas.**
El sistema debe expresar de forma clara y visible:
   - quien es el firmante activo;
   - que version de firma esta activa;
   - desde cuando fue activado;
   - quien hizo el cambio.

## 3. Problema actual

El modelo vigente mezcla cuatro planos que se pueden desalinear:

1. director o directores del centro;
2. versiones de firma subidas por cada director;
3. vigencia historica asociada al centro;
4. PDFs ya emitidos y almacenados.

Esto genera sintomas como:

1. existe una firma cargada pero no aparece en el PDF;
2. existe una vigencia pero apunta a una version distinta;
3. hay un PDF historico que sigue reaprovechandose aunque la firma cambio;
4. si hay dos directores en el centro, no queda claro cual debe firmar.

## 4. Decicion de negocio recomendada

La regla operativa nueva sera:

1. un centro puede tener varios directores activos;
2. un centro solo puede tener un `firmante activo` para documentos de alimentacion;
3. ese firmante activo referencia:
   - `employeeId`
   - `signatureVersionId`
4. los PDFs nuevos usan siempre ese firmante activo;
5. si cambia el firmante activo o cambia la firma activa, los PDFs posteriores usan el nuevo snapshot;
6. los historicos no cambian.

## 5. Alcance funcional

### 5.1 Incluido

1. eliminar la necesidad operativa de seleccionar `fecha de vigencia` para la firma del director;
2. introducir un concepto explicito de `firmante activo del centro`;
3. soportar centros con mas de un director;
4. mantener varias versiones de firma por director;
5. usar el firmante activo al generar nuevos PDFs de alimentacion;
6. preservar snapshots historicos de emisiones ya existentes;
7. registrar auditoria de activacion y cambio de firmante.

### 5.2 Fuera de alcance

1. redisenar el PDF de alimentacion;
2. cambiar la logica de diligenciamiento por visitas;
3. aplicar esta regla automaticamente a otros modulos documentales;
4. permitir multiples firmantes en un mismo PDF;
5. regenerar masivamente historicos existentes;
6. borrar fisicamente firmas historicas ya referenciadas por emisiones.

## 6. Definiciones

### 6.1 Director

Usuario con rol `director` asociado a un centro (`tenant`).

### 6.2 Version de firma

Archivo concreto de firma cargado para un director. Cada subida crea una nueva version.

### 6.3 Firmante activo del centro

Asignacion unica y vigente a nivel de centro que define:

1. que director firma los nuevos documentos;
2. que version exacta de firma se debe usar.

### 6.4 Emision historica

Snapshot congelado de un PDF ya emitido, que conserva:

1. director usado;
2. firma usada;
3. logo usado;
4. archivo PDF resultante.

## 7. Regla funcional principal

### 7.1 Nuevas emisiones

Al exportar un nuevo PDF de alimentacion:

1. se identifica el centro del adulto mayor;
2. se resuelve el `firmante activo` actual del centro;
3. se toma la `signatureVersionId` exacta de ese firmante activo;
4. se incrusta esa firma en el PDF;
5. se guarda snapshot en la emision.

### 7.2 Descarga de historicos

Si ya existe una emision historica reutilizable:

1. se devuelve el PDF almacenado;
2. no se recalcula con el firmante activo actual;
3. el historico sigue mostrando la firma con la que fue emitido.

### 7.3 Cambio de firmante activo

Cuando el usuario administrativo activa un nuevo firmante:

1. el centro pasa a tener un solo firmante activo nuevo;
2. el anterior queda inactivo para nuevas emisiones;
3. los historicos no se modifican.

## 8. Caso de dos directores en un centro

Este caso ya no se resuelve por fecha sino por seleccion explicita.

Regla:

1. ambos directores pueden existir en el centro;
2. ambos pueden tener firma cargada;
3. solo uno puede quedar como `firmante activo` del centro;
4. el sistema debe mostrar claramente quien ocupa ese rol;
5. cambiar entre directores debe ser una accion administrativa explicita.

No se recomienda:

1. elegir automaticamente por fecha de creacion;
2. elegir automaticamente por ultima firma subida;
3. resolver segun el director que creo el registro de alimentacion;
4. mantener dos firmantes activos al mismo tiempo.

## 9. Modelo de datos recomendado

## 9.1 Mantener

Se mantienen estos conceptos:

1. `employee_signature_versions`
2. `alimentacion_formato_emissions`
3. versionado de logos por tenant

## 9.2 Reemplazar para operacion diaria

El concepto `tenant_director_signature_assignments` basado en rangos `effectiveFrom/effectiveTo` deja de ser la fuente operativa principal.

Puede ocurrir una de estas dos estrategias:

### Opcion recomendada

Crear una entidad nueva, por ejemplo `tenant_active_signers`.

Campos sugeridos:

- `tenantId`
- `employeeId`
- `signatureVersionId`
- `activatedAt`
- `activatedByUserId`
- `reason` opcional

Restricciones:

1. un solo registro activo por `tenantId`;
2. `signatureVersionId` debe pertenecer al `employeeId`;
3. `employeeId` debe pertenecer al mismo `tenantId`;
4. el empleado debe tener rol `director`.

### Opcion alternativa de transicion

Mantener la tabla actual pero usarla solo como historial, agregando un marcador fuerte de activo actual.

No es mi recomendacion principal porque mezcla dos semanticas en la misma estructura y puede volver a producir ambiguedad.

## 9.3 Emisiones historicas

`alimentacion_formato_emissions` debe seguir guardando snapshot:

1. `signerEmployeeIdSnapshot`
2. `signerNameSnapshot`
3. `signerRoleSnapshot`
4. `signatureVersionIdSnapshot`
5. `tenantLogoVersionIdSnapshot`
6. `issuedAt`

Estos campos siguen siendo obligatorios para todas las emisiones nuevas.

## 10. Reglas de integridad

1. Un centro no puede tener dos firmantes activos simultaneos.
2. Un director sin firma cargada no puede ser activado como firmante.
3. Una version de firma no puede activarse para otro director.
4. Una firma referenciada por una emision historica no debe eliminarse fisicamente.
5. Si el firmante activo cambia, las nuevas emisiones deben invalidar reusos de PDFs previos.
6. Si cambia la firma activa del mismo director, tambien deben invalidarse nuevas emisiones que dependan del snapshot viejo.

## 11. API funcional sugerida

## 11.1 Empleados

Mantener:

1. subir firma del director;
2. consultar firmas del director;
3. descargar ultima firma o una firma versionada si el producto ya lo soporta.

## 11.2 Firmante activo del centro

Agregar endpoints conceptuales del tipo:

1. `GET /api/tenants/:tenantId/active-signer`
2. `PUT /api/tenants/:tenantId/active-signer`

Payload sugerido de actualizacion:

- `employeeId`
- `signatureVersionId`

No debe pedirse `effectiveFrom` en esta fase.

## 11.3 Alimentacion

La exportacion de PDF debe:

1. resolver firmante activo actual;
2. fallar con error funcional si el centro no tiene firmante activo;
3. seguir reutilizando historicos solo cuando el snapshot siga siendo valido.

## 12. UX recomendada

## 12.1 Pantalla de empleados/directores

Separar claramente dos acciones:

1. `Cargar nueva firma`
2. `Activar como firmante del centro`

La segunda accion no debe pedir fecha de inicio. Debe ser inmediata.

## 12.2 Estado visible

La interfaz debe mostrar con claridad:

1. director firmante actual del centro;
2. nombre del archivo de firma activa;
3. fecha y hora de activacion;
4. usuario que activo el cambio;
5. historial de cambios anteriores.

## 12.3 Caso con dos directores

La interfaz debe permitir:

1. ver ambos directores;
2. ver cual esta activo;
3. cambiar el activo con confirmacion explicita.

## 13. Mensajes funcionales sugeridos

1. Si el centro no tiene firmante activo:
   `El centro no tiene un firmante activo configurado. Solicita al administrador activarlo antes de exportar el formato.`

2. Si el director no tiene firma:
   `El director seleccionado no tiene una firma cargada para activarse como firmante.`

3. Si se intenta activar una firma que no pertenece al director:
   `La firma seleccionada no corresponde al director elegido.`

4. Si el firmante activo cambia correctamente:
   `Firmante activo del centro actualizado correctamente.`

## 14. Migracion propuesta

### 14.1 Objetivo

Migrar del modelo de vigencias por fecha al modelo de firmante activo unico sin perder historico.

### 14.2 Estrategia

1. crear la nueva estructura de `firmante activo`;
2. poblarla inicialmente usando la ultima vigencia conocida por cada centro;
3. validar que la `signatureVersionId` de esa ultima vigencia siga existiendo;
4. si existe ambiguedad o inconsistencia, marcar el centro para revision manual;
5. no tocar snapshots de emisiones historicas.

### 14.3 Casos de inconsistencia

Un centro debe quedar en revision manual si:

1. la ultima vigencia apunta a una firma inexistente;
2. la vigencia apunta a un empleado que ya no corresponde al centro;
3. hay multiples vigencias equivalentes y no se puede determinar una sola fuente de verdad;
4. el director existe pero no tiene archivo de firma legible.

## 15. Criterios de aceptacion

1. Un centro con un solo director y una firma activa puede emitir PDF con firma visible.
2. Un centro con dos directores solo usa el que este marcado como firmante activo.
3. Cambiar el firmante activo cambia la firma usada en futuras emisiones.
4. Cambiar la version de firma activa del mismo director cambia la firma usada en futuras emisiones.
5. Los historicos emitidos antes del cambio conservan la firma anterior.
6. La operacion diaria no requiere seleccionar fecha de vigencia.
7. Si no hay firmante activo, la exportacion falla con mensaje funcional claro.
8. Si existe PDF historico y el snapshot sigue vigente, puede reutilizarse.
9. Si cambia firmante, firma o logo, el snapshot viejo deja de ser reutilizable para nuevas emisiones.

## 16. Riesgos y mitigacion

1. Riesgo: centros con datos historicos inconsistentes.
Mitigacion: migracion con deteccion de inconsistencias y cola de revision manual.

2. Riesgo: confusion entre `director del centro` y `firmante activo`.
Mitigacion: lenguaje explicito en UI y auditoria visible.

3. Riesgo: querer usar dos firmantes a la vez.
Mitigacion: regla fuerte de un solo firmante activo por centro.

4. Riesgo: PDFs viejos se sigan reutilizando por snapshot desactualizado.
Mitigacion: invalidar reuso cuando cambie firmante, firma o logo.

## 17. Recomendacion final de implementacion

Orden recomendado:

1. definir el contrato de `firmante activo del centro`;
2. crear migracion y modelo persistente;
3. adaptar UI administrativa para activar firmante sin fecha;
4. adaptar exportador de alimentacion para resolver firmante activo;
5. conservar snapshots historicos;
6. ejecutar migracion controlada y QA con centros reales.

## 18. Decision recomendada

La mejor recomendacion para este producto es:

1. quitar `fecha de vigencia` del flujo operativo;
2. dejar `un firmante activo unico por centro`;
3. permitir varios directores, pero una sola fuente de firma para nuevos PDFs;
4. mantener el historico congelado por emision.

Ese modelo reduce complejidad, mejora soporte, disminuye ambiguedades y es mas estable para la operacion diaria.
