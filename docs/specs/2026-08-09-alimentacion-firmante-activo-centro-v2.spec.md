# SPEC: Firmante Activo del Centro para Formatos de Alimentacion v2

- Estado: proposed
- Fecha: 2026-08-09
- Modulos:
  - `empleados`
  - `registro-alimentacion`
  - `tenant-branding`
  - `web`
- Fase: redisenio operativo del firmante del centro sin vigencias por fecha
- Complementa:
  - `docs/specs/2026-08-09-alimentacion-firmante-activo-centro.spec.md`
  - `docs/specs/alimentacion-firma-director-historica.spec.md`
  - `docs/specs/2026-07-22-logo-centro-vida-formatos-alimentacion.spec.md`
  - `docs/specs/2026-08-09-alimentacion-formato-entrega-diligenciamiento-visitas.spec.md`

## 1. Objetivo

Definir una version ejecutable del cambio de negocio para que los formatos PDF de alimentacion usen un unico `firmante activo` por centro en lugar de resolver la firma por vigencia temporal.

La meta es reducir ambiguedad operativa, soportar centros con dos directores y eliminar la dependencia diaria de una fecha de vigencia para resolver la firma del documento.

## 2. Principio rector

La regla nueva es esta:

1. un centro puede tener varios directores;
2. cada director puede tener varias firmas versionadas;
3. el centro solo puede tener un firmante activo para alimentacion;
4. el PDF nuevo usa siempre el firmante activo actual;
5. los PDF historicos siguen congelados con su snapshot original;
6. no se usa fecha de vigencia como regla funcional principal.

## 3. Opinion experta

1. **No recomiendo conservar la vigencia por fecha como flujo principal.**
En la practica diaria agrega complejidad sin resolver el problema de fondo.

2. **No recomiendo usar heuristicas para escoger la firma.**
Si el sistema elige "la ultima firma", "el ultimo director" o "la primera vigencia", el soporte se vuelve frágil.

3. **No recomiendo permitir dos firmantes activos simultaneos.**
Si existen dos directores, la decision debe ser explicita y visible.

4. **No recomiendo recalcular historicos con el estado actual.**
Un PDF ya emitido debe permanecer estable.

5. **No recomiendo mezclar activacion de firmante con carga de firma.**
Subir una imagen y activar el firmante son acciones distintas.

## 4. Alcance funcional

### 4.1 Incluido

1. cargar firma de un director;
2. activar una version de firma como firmante del centro;
3. visualizar el firmante activo actual;
4. exportar PDFs nuevos usando el firmante activo;
5. preservar el PDF historico emitido;
6. soportar centros con dos directores;
7. registrar auditoria de cambio de firmante;
8. permitir que el PDF siga usando logo versionado y snapshot de emission.

### 4.2 Fuera de alcance

1. cambiar la maqueta del PDF;
2. cambiar la logica de diligenciamiento por visitas;
3. regenerar historicos ya emitidos;
4. soportar multiples firmantes activos al mismo tiempo;
5. introducir firmas por fecha de vigencia como regla funcional principal;
6. modificar el flujo de importacion de PDFs existentes.

## 5. Decision funcional

El sistema debe manejar tres conceptos distintos:

1. `director`: usuario con rol director;
2. `firma versionada`: archivo concreto cargado para un director;
3. `firmante activo del centro`: seleccion vigente para los documentos de alimentacion.

La interfaz y la API deben expresar estos conceptos de forma separada.

## 6. Problema que resuelve

Este cambio busca evitar estos fallos:

1. el usuario carga una firma nueva, pero el PDF sigue saliendo con la anterior;
2. hay dos directores en el centro y el sistema no sabe cual usar;
3. la fecha de vigencia y la firma activa no coinciden;
4. un PDF historico se reutiliza cuando ya deberia reemitirse;
5. el soporte operacional depende de una fecha manual dificil de auditar.

## 7. Modelo de negocio propuesto

### 7.1 Estado del centro

Cada centro debe tener:

1. cero o un firmante activo;
2. cero o mas firmas cargadas por director;
3. un historial auditable de cambios de firmante.

### 7.2 Cambio de firmante

Un cambio de firmante debe:

1. ser explicito;
2. requerir seleccion de director y firma versionada;
3. registrar usuario que hizo el cambio;
4. registrar fecha y hora de activacion;
5. dejar el firmante anterior como inactivo para nuevas emisiones.

### 7.3 Dos directores en un centro

Si hay dos directores:

1. ambos pueden existir;
2. ambos pueden tener firma cargada;
3. solo uno queda activo para alimentar el PDF;
4. el cambio entre ellos debe ser manual y visible.

## 8. Fase backend

### 8.1 Responsabilidades

El backend debe:

1. persistir firmas versionadas;
2. persistir el firmante activo por centro;
3. resolver el firmante activo al exportar PDF;
4. congelar snapshot al emitir PDF;
5. invalidar reutilizacion cuando cambie el firmante o la firma activa;
6. conservar historicos sin recalcularlos.

### 8.2 Reglas tecnicas

1. No usar `effectiveFrom/effectiveTo` como contrato principal de la exportacion.
2. No depender de la fecha de emision para escoger el firmante.
3. La exportacion debe consultar un `firmante activo` unico.
4. El snapshot historico debe incluir:
   - `signerEmployeeIdSnapshot`
   - `signerNameSnapshot`
   - `signerRoleSnapshot`
   - `signatureVersionIdSnapshot`
   - `tenantLogoVersionIdSnapshot`
5. Si cambia la firma activa, la exportacion siguiente debe regenerar PDF.

### 8.3 Endpoints sugeridos

1. `GET /api/empleados/:id/signature`
2. `POST /api/empleados/:id/signature`
3. `PUT /api/tenants/:tenantId/active-signer`
4. `GET /api/tenants/:tenantId/active-signer`
5. `GET /api/registro-alimentacion/adultos-mayores/:adultoMayorId/formato-entrega/pdf`

### 8.4 Mensajes funcionales

1. Si no hay firmante activo:
   `El centro no tiene un firmante activo configurado.`
2. Si el director no tiene firma:
   `El director seleccionado no tiene una firma cargada.`
3. Si la firma no corresponde al director:
   `La firma seleccionada no corresponde al director elegido.`
4. Si el cambio es exitoso:
   `Firmante activo del centro actualizado correctamente.`

## 9. Fase frontend

### 9.1 Pantalla de empleados/directores

La UI debe mostrar claramente:

1. director;
2. firma cargada;
3. estado activo o inactivo;
4. si es o no firmante activo del centro.

### 9.2 Acciones

Separar en dos acciones visibles:

1. `Cargar nueva firma`;
2. `Activar como firmante del centro`.

### 9.3 Quitar fecha de vigencia

El formulario de firma no debe pedir fecha de vigencia para operar el PDF.

La fecha de activacion, si se muestra, debe ser solo informativa y de auditoria.

### 9.4 Caso con dos directores

La interfaz debe permitir:

1. ver ambos directores;
2. ver cual esta activo;
3. cambiar el activo con confirmacion;
4. evitar que queden dos activos al mismo tiempo.

## 10. Fase migracion

### 10.1 Objetivo

Migrar desde vigencias por fecha a firmante activo unico sin perder historico.

### 10.2 Estrategia

1. identificar la ultima vigencia conocida por centro;
2. convertirla en el firmante activo inicial;
3. validar que la firma versionada siga existiendo;
4. si hay ambiguedad, dejar el centro en revision manual;
5. no modificar snapshots historicos ya emitidos.

### 10.3 Casos a revisar manualmente

1. centros con vigencias solapadas;
2. centros con firma faltante en filesystem;
3. centros con dos directores y una vigencia poco clara;
4. centros donde la ultima vigencia apunta a una version inexistente.

## 11. Fase PDF

### 11.1 Reglas de exportacion

1. si hay PDF historico reusable y el snapshot sigue vigente, se devuelve el archivo almacenado;
2. si el firmante activo cambio, se reemite;
3. si la firma activa cambio, se reemite;
4. si el logo activo cambio, se reemite;
5. si falta la firma o el archivo historico, el PDF no debe romperse por una ausencia de archivo tolerable.

### 11.2 Inmutabilidad

Un PDF ya emitido no debe cambiar su firma aunque cambie el director activo despues.

## 12. Criterios de aceptacion

1. Un centro con un solo director puede exportar PDF con firma visible.
2. Un centro con dos directores puede definir un unico firmante activo.
3. La UI muestra claramente quien esta activo.
4. El cambio de firmante activo no requiere fecha de vigencia.
5. El PDF nuevo usa la firma del firmante activo.
6. Los historicos siguen mostrando la firma original.
7. El sistema evita dejar dos firmantes activos simultaneos.
8. Si no existe firmante activo, la exportacion falla con mensaje funcional claro.

## 13. Riesgos

1. Riesgo: migracion incompleta de centros con datos historicos ambiguos.
Mitigacion: revision manual de casos conflictivos.

2. Riesgo: confundir carga de firma con activacion.
Mitigacion: separar claramente ambos flujos en UI y API.

3. Riesgo: volver a depender de fecha de vigencia por costumbre.
Mitigacion: eliminar el campo de la UX operacional.

4. Riesgo: PDFs reusados con snapshot viejo.
Mitigacion: invalidar reuso cuando cambie firmante, firma o logo.

## 14. Plan de implementacion por fases

### Fase 1

Definir y persistir el concepto de firmante activo unico por centro.

### Fase 2

Adaptar la UI de empleados para activar firmante sin fecha de vigencia.

### Fase 3

Actualizar el exportador PDF para resolver solo el firmante activo y sus snapshots.

### Fase 4

Migrar datos historicos desde vigencias a firmante activo.

### Fase 5

Validar con casos reales de un director y de dos directores.

## 15. Recomendacion final

La opcion mas robusta para el negocio es:

1. eliminar la vigencia por fecha del flujo operativo;
2. mantener una sola figura de `firmante activo` por centro;
3. permitir multiples directores;
4. congelar snapshots por emision;
5. mantener el historico como auditoria, no como regla activa.
