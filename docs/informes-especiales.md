# Informes especiales

En **Informes → Especiales → Nuevo informe** se elige cliente, título, objetivo opcional, fechas inclusivas, resultado principal (compras, mensajes o leads), alcance y secciones.

- El período puede cruzar meses y años, o ser de un solo día. No se admiten fechas futuras.
- El alcance es toda la cuenta o una selección de campañas. La lista incluye campañas históricas. El mismo filtro se aplica a totales, serie diaria, anuncios, audiencias, geografía y ubicaciones, incluso al paginar.
- El alcance único se consulta para todo el período; nunca se suman alcances diarios o de campañas.
- Un error en las consultas de métricas seleccionadas impide generar una entrega parcial. No se sustituyen errores por ceros ni se amplía la selección de campañas.
- La bitácora reúne notas locales, notas del servidor y actividad de Meta dentro del período. Como las notas no tienen atribución de campaña, se identifica expresamente como contexto de toda la cuenta. Las fallas de bitácora se informan dentro del documento.

Los borradores se guardan en IndexedDB después de una pausa breve al editar; también existe **Guardar borrador**. Se muestran los errores de almacenamiento y los cambios pendientes. Al cambiar fechas, alcance, resultado o secciones se invalida la vista previa: hay que generarla otra vez. Los textos propios se conservan.

**Finalizar** guarda métricas, datos del documento, identidad visual y textos. Reabrir el informe no consulta las métricas de Meta. La versión final no se puede sobrescribir, incluso desde otra pestaña con un borrador viejo. **Duplicar** crea un borrador independiente y requiere generar sus datos de nuevo.

**Imprimir / Guardar PDF** usa el diálogo de impresión del navegador, con diseño A4 y nombre de archivo basado en el cliente y el título. La impresión es clara; la vista previa puede ser clara u oscura. Solo se imprime la pestaña activa. Los anuncios se ordenan por el resultado principal (ROAS para e-commerce), para conservar el mismo orden al volver a abrir.

La biblioteca es local al navegador y al origen de Orion; no se sincroniza con la cartera de Google/Firebase. Borrar los datos del sitio elimina esta biblioteca. Las miniaturas y enlaces externos de Meta pueden caducar: el PDF descargado conserva la entrega tal como se imprimió. Las comparaciones entre períodos quedan para una próxima versión.

## Verificación

- `npm run test:special`: fechas, notas, filtros, paginación, errores y copias finales.
- `npm run test:special-print`: recorrido real de la UI con datos sintéticos, recuperación del borrador, copia final, selección de secciones, diseño móvil y exportación PDF. Requiere Chromium de Playwright y acceso a localhost. Crea evidencia en `tmp/special-reports-qa/`.
- `npm run test:reports`, `npm run test:weekly`, `npx tsc --noEmit`, `npm run build`.
