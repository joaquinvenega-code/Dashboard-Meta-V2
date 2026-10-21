# Informes semanales sin servidor permanente

Orión sigue alojado en GitHub Pages. Los PDF se imprimen con Chromium usando el mismo componente de **Detalle de cuentas**, no el informe mensual.

## Qué se guarda

En Configuración → Informes semanales se marca explícitamente **Cliente activo** y **PDF los lunes**. La visibilidad del tablero y el estado de una cuenta en Meta no activan informes. Los clientes consolidados generan un archivo y sus cuentas miembro no se repiten. Mensajería, compras, ambas y leads conservan su configuración; también se guardan las métricas visibles, el orden y la cantidad de anuncios y las opciones de impresión.

La cartera incluye agrupaciones, categorías, configuración y notas locales. El botón **Guardar esta cartera** realiza la migración inicial a Firestore. Después, los cambios se guardan automáticamente mientras la sesión de Google esté conectada. **Cargar cartera guardada** recupera los datos en otro navegador y conserva un respaldo local antes de reemplazarlos. Una revisión de servidor evita sobrescribir cambios de otro dispositivo: si hay conflicto, se detiene el guardado y se pide cargar la versión remota. Exportar respaldo permite conservar un JSON local.

## Firebase Spark

Usar un proyecto dedicado en plan Spark, sin facturación vinculada.

1. App web `Orion GitHub Pages` registrada, sin Hosting y sin Blaze.
2. Firestore Standard creado, base `(default)`, en São Paulo (`southamerica-east1`), inicialmente cerrado en modo producción.
3. Reglas de `firestore.rules` publicadas. La cartera vive en `orionUsers/<UID>/portfolio/current` y solo su propietario autenticado puede leerla o modificarla.
4. Proveedor Google habilitado en Authentication y dominio `joaquinvenega-code.github.io` autorizado.
5. La configuración pública de esta app ya está incluida en `src/firebase-applet-config.json`. Para otro proyecto se puede reemplazar mediante estas variables del repositorio de Pages: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`.
6. Conectar con Google dentro de Orión y guardar la cartera. El panel muestra el UID necesario para la tarea.

Las notas y ventas escritas por el asistente también se limitan al usuario en `orionUsers/<UID>/clients`; las antiguas rutas compartidas quedan cerradas. La sincronización semanal utiliza el documento de cartera; no requiere ejecutar el servidor Express ni Cloud Functions.

## Repositorio privado de ejecución

Instalar `.github/workflows/weekly-reports.yml` en un repositorio privado dedicado y mantenerlo desactivado hasta completar la configuración. La copia en el repositorio público se omite automáticamente y nunca sube informes reales.

Variables del repositorio privado:

- `ORION_SOURCE_REF`: SHA completo de 40 caracteres del commit de código revisado. El flujo no acepta una rama móvil.
- `ORION_WEEKLY_ENABLED`: `true` solo después de una prueba real y de guardar los clientes elegidos; dejar sin configurar mientras tanto.

Secretos del repositorio privado (no se ponen en el código ni en variables `VITE_*`):

- `FIREBASE_SERVICE_ACCOUNT`: JSON de una cuenta de servicio dedicada con acceso de lectura a Firestore, preferentemente rol `roles/datastore.viewer`. No usar una cuenta con rol de propietario/editor.
- `ORION_OWNER_UID`: UID mostrado en el panel de cartera.
- `META_ACCESS_TOKEN`: token vigente autorizado para las cuentas seleccionadas y las consultas de métricas y actividad. La sesión del navegador no se copia al runner. Si se revoca o vence, hay que renovarlo para volver a generar.

Variable del repositorio de Pages para mostrar el enlace de descarga:

- `VITE_WEEKLY_ACTIONS_URL=https://github.com/OWNER/PRIVATE-REPO/actions/workflows/weekly-reports.yml`.

La generación queda programada para los lunes a las **09:17 de Argentina** (12:17 UTC), sujeta a demoras de GitHub Actions. Siempre usa la semana completa anterior; la ejecución manual vuelve a calcular el mismo período si se realiza durante esa semana. El ZIP se descarga de la ejecución privada y contiene PDF y `resultado.json`. No envía mensajes a clientes.

## Límites y resultados

- Runner Linux estándar, máximo 25 minutos por ejecución, sin ejecuciones simultáneas.
- Retención de archivos: 7 días. Límite del lote: 60 MB. Esto limita el almacenamiento, pero no reemplaza el control de facturación.
- Revisar cuota compartida de Actions y configurar presupuesto de gasto adicional con bloqueo para sostener el requisito de cero cargos; no habilitar consumo facturable.
- Un fallo en una cuenta de un cliente consolidado impide emitir su PDF; los otros clientes siguen procesándose. Las ejecuciones con fallos terminan en error y el manifiesto identifica qué clientes requieren revisión.
- Las ventas manuales semanales deben tener fechas. Un total mensual sin registros fechados no se distribuye ni se atribuye completo a una semana.
- No se suman cuentas con monedas diferentes. Corregir la consolidación antes de generar.
- Los PDF se mantienen privados; no se copian a Pages, al repositorio público ni a un Release público.

## Verificación local

```powershell
npm ci
npm run lint
npm run test:reports
npm run test:weekly
$env:VITE_REPORT_RUNNER='true'
npm run build
npx playwright install chromium
npm run test:weekly-print
```

`test:weekly-print` usa datos ficticios y genera tres PDF en `tmp/pdfs/weekly/`. Verifica los tipos de cliente, el período, la exclusión de notas de otras fechas, que las métricas no se recorten y que la impresión de un snapshot no consulte Meta. Los PDF de prueba no son informes reales.

Para emitir un lote real, configurar los tres secretos como variables de entorno del proceso y ejecutar `npm run reports:weekly` después de la compilación de impresión. No imprimir secretos en la terminal ni guardarlos en archivos versionados. La compilación normal de Pages no debe establecer `VITE_REPORT_RUNNER`.
