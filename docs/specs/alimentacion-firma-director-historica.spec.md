# SPEC: Firma Historica del Director en Formato de Entrega de Alimentos

- Estado: proposed
- Fecha: 2026-06-20
- Modulo: `registro-alimentacion`
- Fase: firma del director con preservacion historica

## 1. Objetivo de la fase

Permitir que el `Formato de Entrega de Alimentos y Auxilio de Transporte` muestre la firma del director del centro, asegurando que:

1. los formatos historicos no cambien si el director renuncia o es reemplazado;
2. la firma usada en cada emision quede congelada para auditoria;
3. el sistema soporte archivos de firma en formatos de imagen comunes.

## 2. Opinion experta (critica, no complaciente)

1. **No recomiendo leer la firma directamente desde el empleado actual al generar historicos.**
Si la firma vive solo en el perfil actual del director, cualquier reemplazo alteraria documentos viejos.
2. **No recomiendo sobrescribir una firma existente.**
Cada cambio de firma debe crear una nueva version.
3. **No recomiendo depender solo del rol `director` para resolver la firma.**
El sistema debe saber cual director firmante estuvo vigente en una fecha o emision concreta.
4. **No recomiendo regenerar documentos historicos desde datos mutables sin snapshot.**
Para auditoria, la emision debe quedar congelada con nombre, cargo y firma usados.
5. **No recomiendo atar el historico a una sola tabla de empleados.**
Se necesitan entidades separadas para firma versionada, vigencia del firmante y documento emitido.

## 3. Problema de negocio

El formato debe mostrar la firma del director del centro.

Caso critico:

1. Director A firma formatos durante varios meses.
2. Director A renuncia.
3. Director B entra y sube nueva firma.
4. Los formatos ya emitidos con Director A **no pueden cambiar** a la firma de Director B.

Conclusion:

- la firma no puede ser un dato mutable referenciado "en vivo";
- debe existir una estrategia de versionado e historial.

## 4. Alcance funcional propuesto

1. Gestion de empleados permite cargar firma del director.
2. El centro define un `director firmante vigente`.
3. Al emitir el formato PDF, el sistema resuelve la firma vigente y la incrusta en el documento.
4. La emision guarda snapshot historico del firmante.
5. Las reconsultas historicas deben usar la emision congelada, no el empleado actual.

## 5. Recomendacion de arquitectura

La solucion recomendada tiene tres capas:

1. **Firma versionada**
- una firma nueva no reemplaza la anterior;
- crea una nueva version.

2. **Asignacion historica del director firmante**
- cada centro tiene un firmante vigente por rango de fechas;
- si cambia el director, se cierra la vigencia anterior y se abre una nueva.

3. **Documento emitido congelado**
- cada emision del formato guarda la firma exacta usada;
- ese historico no depende del perfil actual del empleado.

## 6. Modelo de datos recomendado

## 6.1 `employee_signature_versions`

Responsabilidad: almacenar versiones de firma por empleado.

Campos sugeridos:

- `id`
- `employeeId`
- `tenantId`
- `originalName`
- `mimeType`
- `sizeBytes`
- `relativePath`
- `checksum`
- `createdAt`
- `uploadedByUserId`
- `isActive` (opcional, solo para administracion visual)

Reglas:

1. nunca sobrescribir archivo existente;
2. cada subida crea una nueva fila;
3. firmas usadas por emisiones historicas no se eliminan fisicamente.

## 6.2 `tenant_director_signature_assignments`

Responsabilidad: definir que director firmante aplica a un centro en un periodo.

Campos sugeridos:

- `id`
- `tenantId`
- `employeeId`
- `signatureVersionId`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `createdByUserId`
- `reason`

Reglas:

1. no puede haber dos asignaciones vigentes que se crucen para el mismo centro;
2. `effectiveTo = null` significa vigente;
3. cuando cambia el director, se cierra la asignacion anterior y se crea una nueva.

## 6.3 `alimentacion_formato_emissions`

Responsabilidad: congelar la emision del formato y su firma.

Campos sugeridos:

- `id`
- `tenantId`
- `adultoMayorId`
- `deliveryMonth`
- `version`
- `signerEmployeeIdSnapshot`
- `signerNameSnapshot`
- `signerRoleSnapshot`
- `signatureVersionIdSnapshot`
- `pdfRelativePath`
- `issuedAt`
- `issuedByUserId`
- `sourceRecordCount`
- `sourceDateFrom`
- `sourceDateTo`

Reglas:

1. la consulta historica debe salir desde esta entidad;
2. si un formato necesita correccion posterior, se genera nueva `version`;
3. la version anterior no se reescribe.

## 7. Regla de resolucion de firma

## 7.1 Para nuevas emisiones

Al exportar el formato:

1. resolver el centro (`tenantId`);
2. identificar la asignacion del director firmante vigente para la fecha o periodo aplicable;
3. tomar la `signatureVersionId` asociada;
4. incrustar esa firma en el PDF;
5. guardar snapshot en `alimentacion_formato_emissions`.

## 7.2 Para historicos

Al consultar o descargar un formato ya emitido:

1. leer la emision historica;
2. usar el PDF guardado o el snapshot congelado;
3. **no** recalcular con la firma actual del director.

## 8. Decision importante sobre la fecha de vigencia

Hay dos estrategias posibles:

### Opcion A - vigencia por fecha de emision

- El formato usa el director vigente en la fecha exacta en que se emite el PDF.
- Es mas simple operacionalmente.

### Opcion B - vigencia por periodo del formato

- El formato usa el director asignado al periodo cubierto por los registros.
- Es mas estricta historicamente.

### Recomendacion

Recomiendo **vigencia por fecha de emision**, con una regla adicional:

- si el centro necesita representar un mes historico con el director que estaba vigente en ese mes, entonces debe emitirse y congelarse en ese momento o debe existir una regla formal de reconstruccion historica.

## 9. Caso borde: cambio de director a mitad de mes

Este caso debe definirse explicitamente.

Opciones:

1. usar el director vigente al momento de emision del PDF;
2. dividir el mes en dos emisiones si hubo cambio de director;
3. usar una firma institucional fija del centro.

Recomendacion experta:

- para operacion simple, usar el director vigente al momento de emision;
- para auditoria estricta, dividir emisiones o manejar una firma institucional.

## 10. Tipos de archivo permitidos

Formatos aceptados de entrada:

- `image/png`
- `image/jpeg`
- `image/jpg`
- opcional: `image/webp`

No recomendados en esta fase:

- `svg`
- `gif`
- `bmp`
- `pdf` como firma

Validaciones sugeridas:

1. tamano maximo: `2 MB` o `3 MB`;
2. extension y `mimeType` consistentes;
3. dimensiones minimas razonables para impresion;
4. archivo no vacio;
5. fondo preferiblemente transparente o blanco.

Recomendacion tecnica:

- aceptar `png`, `jpg`, `jpeg` y opcionalmente `webp`;
- normalizar internamente a `png` para render consistente en PDF.

## 11. Flujo funcional propuesto

## 11.1 Gestion de firma en empleados

1. Crear o editar empleado director.
2. Subir firma.
3. El sistema crea una nueva `employee_signature_version`.
4. El usuario administrador puede verla, reemplazarla o cambiar la vigente.

## 11.2 Asignacion del director firmante del centro

1. Desde configuracion del centro o desde gestion de empleados:
- seleccionar director firmante;
- seleccionar firma version vigente;
- indicar fecha de inicio de vigencia.
2. El sistema cierra la vigencia anterior si existe.

## 11.3 Emision del formato

1. Usuario exporta el formato.
2. El backend resuelve el director firmante vigente.
3. Genera el PDF con la firma incrustada.
4. Guarda snapshot y archivo emitido.
5. Registra auditoria.

## 12. API sugerida

## 12.1 Empleados

Separaria la firma del JSON principal del empleado.

Endpoints sugeridos:

- `POST /api/empleados/:id/signature`
- `GET /api/empleados/:id/signature`
- `DELETE /api/empleados/:id/signature/:signatureVersionId` (solo logico o restringido)

Motivo:

- hoy empleados opera con payload JSON simple;
- mezclar el alta/edicion del empleado con `multipart/form-data` sube la complejidad sin necesidad.

## 12.2 Centro / tenant

Endpoints sugeridos:

- `POST /api/backoffice/tenants/:id/director-signature-assignment`
- `GET /api/backoffice/tenants/:id/director-signature-assignment`

## 12.3 Emisiones del formato

Endpoints sugeridos:

- `POST /api/registro-alimentacion/formato-entrega/emissions`
- `GET /api/registro-alimentacion/formato-entrega/emissions/:id`

Nota:

- si se quiere mantener el endpoint actual de exportacion, internamente debe pasar por la capa de emision historica.

## 13. Cambios tecnicos recomendados

## 13.1 Contracts (`packages/contracts`)

1. Agregar contratos para subida y detalle de firma.
2. Agregar contrato para asignacion de director firmante.
3. Agregar contrato para emision historica del formato.

## 13.2 API (`apps/api`)

1. Nuevo almacenamiento de firmas versionadas.
2. Nuevo flujo `multipart/form-data` para firma de empleado.
3. Resolucion historica del director firmante.
4. Ajuste del export de alimentacion para incrustar imagen de firma.
5. Persistencia del PDF emitido o, como minimo, del snapshot historico.

## 13.3 Web (`apps/web`)

1. Campo para subir firma en empleados.
2. Vista previa de firma actual.
3. Accion para marcar director firmante vigente del centro.
4. Mensajes claros cuando el centro no tenga firma configurada.

## 14. Auditoria obligatoria

Eventos sugeridos:

- `empleados.signature_uploaded`
- `empleados.signature_replaced`
- `tenants.director_signature_assigned`
- `tenants.director_signature_assignment_closed`
- `alimentacion.formato_emitted`
- `alimentacion.formato_reissued`

Metadata minima:

- `tenantId`
- `employeeId`
- `signatureVersionId`
- `deliveryMonth`
- `actorUserId`
- `issuedAt`

## 15. Seguridad y conservacion documental

1. Las firmas historicas referenciadas por emisiones no deben poder eliminarse fisicamente.
2. El acceso a firmas debe respetar scope multi-tenant.
3. El archivo emitido debe guardarse en ruta controlada y auditable.
4. Si hay reemplazo de firma, el sistema debe conservar trazabilidad de quien hizo el cambio.

## 16. Criterios de aceptacion (DoD)

1. El sistema acepta firma en `png`, `jpg` y `jpeg`.
2. La firma del director aparece en el bloque derecho del formato.
3. Cuando cambia el director, los formatos nuevos usan la nueva firma.
4. Los formatos historicos no cambian al cambiar el director.
5. Cada reemplazo de firma genera nueva version y no sobrescribe la anterior.
6. Existe trazabilidad de quien subio la firma, quien cambio la asignacion y quien emitio el formato.
7. Si no existe director firmante vigente, el sistema responde con error funcional claro y no genera PDF invalido.

## 17. Riesgos y mitigacion

1. Riesgo: subir archivos enormes o en formatos inconsistentes.
Mitigacion: validacion estricta de mime, extension y tamano.
2. Riesgo: recalculo historico con datos mutables.
Mitigacion: emision congelada + snapshot de firma.
3. Riesgo: dos directores vigentes al mismo tiempo.
Mitigacion: constraint de no solapamiento por `tenant`.
4. Riesgo: cambios de director a mitad de mes generan ambiguedad.
Mitigacion: definir regla formal de emision o versionado por periodo.

## 18. Decisiones recomendadas para cerrar antes de implementar

1. Confirmar si la vigencia se resuelve por fecha de emision o por periodo del formato.
2. Confirmar si se guardara el PDF emitido o solo el snapshot historico.
3. Confirmar si `webp` entra en alcance inicial o queda para fase posterior.
4. Confirmar si la asignacion del director firmante vive en `backoffice` o en `gestion-empleados`.

## 19. Plan de ejecucion recomendado

1. **Paso 1 - Modelo historico**
- versionado de firmas + asignacion de director firmante.
2. **Paso 2 - Upload de firma**
- endpoints, validaciones y almacenamiento seguro.
3. **Paso 3 - Integracion PDF**
- incrustar firma en el formato de alimentacion.
4. **Paso 4 - Emision congelada**
- snapshot historico + auditoria + consulta posterior.
5. **Paso 5 - QA funcional**
- cambio de director, reimpresion historica, firmas invalidas, centro sin firma.
