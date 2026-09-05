# SPEC: Diligenciamiento por Visitas del Formato de Entrega de Alimentos

- Estado: proposed
- Fecha: 2026-08-09
- Modulo: `registro-alimentacion`
- Fase: diligenciamiento del PDF de formato de entrega
- Complementa:
  - `docs/specs/alimentacion-formato-entrega-individual-v2.spec.md`
  - `docs/specs/2026-08-06-importar-pdf-alimentacion.spec.md`

## 1. Objetivo

Hacer que el PDF de `Formato de Entrega de Alimentos y Auxilio de Transporte` se diligencie por **cantidad de visitas** del adulto mayor durante el periodo, sin modificar la maqueta ni la distribucion visual del formato.

La regla operativa queda asi:

1. el formato conserva sus 24 columnas visibles;
2. cada visita ocupa una columna, en orden secuencial;
3. si el adulto mayor asiste 5 veces, se marcan 5 columnas;
4. si asiste 3 veces, se marcan 3 columnas;
5. si hay mas de 24 visitas, solo se diligencian las primeras 24 y el resto se omite;
6. el PDF no cambia de estructura, solo cambia la logica de llenado.

## 2. Opinion experta

1. **No recomiendo cambiar el formato visual.**
El formato ya esta aprobado operativamente y el riesgo esta en la logica, no en el layout.
2. **No recomiendo asignar las marcas por dia calendario si la regla de negocio es por visitas.**
El numero de visita debe ser la unidad de llenado.
3. **No recomiendo permitir mas de 24 marcas en una sola hoja.**
Si el formato no cambia, la regla debe cortar en 24 para evitar ambiguedad de impresion.
4. **No recomiendo repartir las visitas con heuristicas ambiguas.**
Debe existir un orden deterministico para saber que columna se llena primero.
5. **No recomiendo mezclar esta regla con la importacion de PDFs diligenciados.**
La importacion debe conservar su propio contrato y este spec solo regula el PDF generado por el sistema.

## 3. Alcance funcional

### 3.1 Incluido

1. Diligenciamiento del PDF generado por el sistema de alimentacion.
2. Marcado de columnas segun numero de visitas.
3. Corte estricto en 24 marcas por formato.
4. Conservacion de la estructura visual actual:
   - encabezado;
   - tabla de productos;
   - area de descripcion;
   - firmas;
   - 12 columnas superiores y 12 inferiores, para un total de 24 espacios visibles.
5. Orden deterministico para asignar las marcas.

### 3.2 Fuera de alcance

1. Cambiar el diseno del formato.
2. Agregar una tercera pagina o una segunda grilla por excedente.
3. Reemplazar el concepto de visitas por dias calendario.
4. Alterar el flujo de importacion de PDFs diligenciados.
5. Redisenar la tabla o ampliar el numero de columnas visibles.

## 4. Definiciones de negocio

### 4.1 Visita

Para este spec, una visita es cada vez que el adulto mayor recibe atencion o entrega dentro del periodo que alimenta el formato.

La unidad de diligenciamiento no es el dia del calendario sino el evento de visita.

### 4.2 Columna de diligenciamiento

Cada columna visible del formato representa una visita posible. El formato mantiene 24 columnas totales:

1. 12 columnas en la primera franja;
2. 12 columnas en la segunda franja.

### 4.3 Marca

La marca en la celda diligenciada sera `X`.

No se usaran otros simbolos para esta fase porque la prioridad es la legibilidad en impresion y la consistencia con formatos fisicos.

## 5. Regla principal de diligenciamiento

1. Se toma la lista de visitas del adulto mayor dentro del periodo que se esta exportando.
2. Las visitas se ordenan de forma deterministica por fecha/hora ascendente.
3. La primera visita ocupa la primera columna disponible.
4. La segunda visita ocupa la segunda columna disponible.
5. La secuencia continua hasta agotar:
   - la lista de visitas, o
   - las 24 columnas disponibles.
6. Si existe excedente de visitas por encima de 24, el excedente se omite sin romper el PDF.

## 6. Regla de mapeo visual

### 6.1 Estructura del formato

1. El PDF conserva el mismo encabezado institucional.
2. La tabla mantiene sus filas:
   - `Refrigerio 1`
   - `Almuerzo`
   - `Refrigerio 2`
   - `Auxilio de transporte`
3. La grilla de columnas mantiene 24 espacios visibles.
4. Las firmas y la descripcion de la actividad permanecen intactas.

### 6.2 Diligenciamiento por visita

Para cada visita aceptada dentro del maximo de 24:

1. se asigna una columna;
2. se marca `X` en las celdas que correspondan a los productos entregados en esa visita;
3. las celdas de esa columna que no apliquen para la visita permanecen vacias.

### 6.3 Columnas sin visita

Si el adulto mayor tuvo menos de 24 visitas:

1. las columnas sobrantes quedan vacias;
2. no se rellena con numeros, guiones ni texto auxiliar;
3. no se altera la maquetacion del PDF.

## 7. Fuente de datos esperada

La implementacion debe construir el PDF a partir de la informacion de alimentacion ya disponible en el backend.

La fuente debe proveer, como minimo:

1. identificacion del adulto mayor;
2. periodo a exportar;
3. lista ordenada de visitas o eventos equivalentes;
4. indicadores de productos entregados por visita;
5. informacion del tenant y del centro;
6. informacion del formato o firma si ya existe en el flujo actual.

Si el sistema actual no tiene una entidad llamada `visita`, la logica puede derivarse de los registros operativos existentes, siempre que el resultado sea deterministico y auditables.

## 8. Reglas tecnicas recomendadas

1. La plantilla PDF debe seguir siendo una funcion pura de render.
2. La regla de asignacion de columnas debe vivir fuera de la plantilla para facilitar pruebas.
3. El recorte en 24 debe ocurrir antes de renderizar.
4. El render no debe depender del ancho del texto para decidir cuantas marcas mostrar.
5. Deben existir pruebas unitarias para:
   - 0 visitas;
   - 1 visita;
   - 3 visitas;
   - 5 visitas;
   - 24 visitas;
   - mas de 24 visitas.

## 9. Contrato funcional esperado

### 9.1 Entrada

La exportacion recibe:

1. `adultoMayorId`
2. `deliveryMonth`
3. datos de visitas y productos del periodo

### 9.2 Salida

1. PDF con la misma estructura visual actual.
2. `X` marcadas por visita hasta 24 columnas.
3. Sin alteracion de dimensiones ni de secciones del formato.

## 10. Criterios de aceptacion

1. El formato se ve igual antes y despues del cambio.
2. La logica llena columnas por numero de visitas y no por dia calendario.
3. Un adulto mayor con 5 visitas produce 5 marcas.
4. Un adulto mayor con 3 visitas produce 3 marcas.
5. Un adulto mayor con mas de 24 visitas no rompe el PDF y solo se reflejan 24.
6. Las celdas sobrantes quedan vacias.
7. El PDF sigue siendo apto para impresion manual.

## 11. Riesgos y mitigacion

1. Riesgo: confundir visita con dia calendario.
Mitigacion: definir la secuencia por evento y no por fecha.
2. Riesgo: excedentes por encima de 24.
Mitigacion: corte estricto y prueba de borde.
3. Riesgo: distintos criterios de ordenamiento entre backend y front.
Mitigacion: el orden se define en un solo lugar y se prueba de forma aislada.
4. Riesgo: cambiar accidentalmente el formato visual.
Mitigacion: pruebas de snapshot o comparacion visual del PDF.

## 12. Plan de ejecucion recomendado

1. **Paso 1 - Definir fuente de visitas**
- Identificar el conjunto de datos operativo que representa cada visita.
- Confirmar el orden de las visitas dentro del periodo.

2. **Paso 2 - Implementar mapeo**
- Crear la funcion que transforma visitas en 24 columnas maximas.
- Cortar el excedente y dejar columnas vacias donde no haya visita.

3. **Paso 3 - Integrar con la plantilla**
- Conectar el resultado del mapeo al generador PDF sin cambiar la maqueta.

4. **Paso 4 - Cobertura de pruebas**
- Probar 0, 1, 3, 5, 24 y mas de 24 visitas.
- Validar que el PDF no cambie visualmente.

5. **Paso 5 - QA funcional**
- Revisar el PDF impreso con casos reales de asistencia variable.
