# Tasks

## 1. Base de datos y configuración

- [x] 1.1 Crear la migración `supabase/migrations/035_contratos_documentos_comprobantes.sql` con las columnas del documento en `contratos`, las tablas `comprobantes` y `aviso_cuota` y las RPCs públicas del portal — verificación: el archivo existe, es idempotente (`IF NOT EXISTS`) y `openspec` no lo toca.
- [x] 1.2 Declarar los buckets privados `contratos` y `comprobantes` con su límite de 10 MB y las políticas de Storage (INSERT de `anon` solo en `cobranza-<id>/`, todo lo demás con sesión) — verificación: los `INSERT INTO storage.buckets` y `CREATE POLICY` están en la migración 035.
- [x] 1.3 Documentar las variables de entorno del servidor en `.env.example` y publicar la guía de puesta en marcha en `docs/cron-avisos-cuotas.md` — verificación: el archivo lista `CRON_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_*`, `APP_URL` y `DIAS_AVISO_CUOTA`, y la guía indica el orden migración → Vercel → despliegue.

## 2. Documento del contrato (`contratos/documento`)

- [x] 2.1 Definir los puertos `DocumentoContratoStorage` y `GeneradorDocumentoContrato` con la validación de formato y límite, e implementarlos en Supabase (bucket privado + URL firmada) y en Mock — verificación: `npx tsc -b` sin errores.
- [x] 2.2 Implementar los use cases de generar, anexar, abrir y quitar el documento, con `SupabaseContractRepository.setDocumento` detrás — verificación: `npx tsc -b` sin errores.
- [x] 2.3 Agregar el botón "Generar o anexar / Administrar" en la columna Documento de `ContratosPage` y el `DocumentoContratoModal` con las cuatro acciones — verificación: `npx tsc -b` sin errores y la columna muestra "Sin documento", "Generado" o "Anexado".
- [x] 2.4 Escribir los generadores Word (`docx`) y PDF (`jspdf`) sobre `estructuraContrato` e importarlos de forma lazy desde la fachada — verificación: `npm run build` termina y el bundle principal queda por debajo del límite de precarga de workbox (3 MiB), con `GeneradorDocumentoDocx-*.js` y `GeneradorDocumentoPdf-*.js` como chunks aparte.
- [x] 2.5 Bajar el documento del contrato desde el módulo de Ventas: el DTO de contrato lleva las columnas del documento, hay un use case `DescargarDocumentoContratoUseCase` (URL firmada con `download`) y la columna Contrato de `VentasPage` ofrece "Descargar" — verificación: `npx tsc -b` sin errores y el botón solo aparece cuando el contrato tiene documento.

## 3. Aviso automático de cuotas (`clientes/avisos-cuota`)

- [x] 3.1 Crear `api/cron/cuotas-vencimiento.ts` con la validación de `CRON_SECRET`, el marcado de cuotas vencidas y la consulta de datos por consultas sueltas — verificación: `curl` con el header correcto responde 200 y sin header responde 401.
- [x] 3.2 Agregar las plantillas `avisarCuotaPorVencer` y `avisarCuotaVencida` en `lib/correo.ts`, con el monto en la moneda de la empresa y el link al portal — verificación: los textos incluyen contrato, lote, cuota, monto y fecha.
- [x] 3.3 Registrar los avisos en `aviso_cuota` (`UNIQUE (id_cobranza, tipo)`) y saltear a los clientes sin correo y a los que ya subieron comprobante — verificación: dos ejecuciones seguidas no duplican envíos y el resultado informa `correosEnviados` y `omitidos`.
- [x] 3.4 Declarar el cron en `vercel.json` (`0 8 * * *`) — verificación: el path del cron coincide con la ruta de `api/cron/cuotas-vencimiento.ts`.
- [ ] 3.5 Verificar el cron en el entorno desplegado (migración 035 aplicada y env vars cargadas) — verificación: un `curl` con `Authorization: Bearer $CRON_SECRET` responde `ok: true` y al menos un correo de prueba llega al buzón.

## 4. Portal y comprobantes (`clientes/portal-comprobante`)

- [x] 4.1 Crear las RPCs `portal_cliente_por_cedula` y `portal_registrar_comprobante` (SECURITY DEFINER) y su traducción en `SupabasePortalClienteRepository` — verificación: la RPC solo devuelve datos de quien presenta la cédula y rechaza cuotas ajenas.
- [x] 4.2 Crear la ruta pública `/portal-cliente` con `PortalClientePage`: consulta por cédula, contratos, cuotas y estados — verificación: abrir `/portal-cliente` en el build no produce errores de consola.
- [x] 4.3 Implementar `RegistrarComprobantePortalUseCase` (valida archivo y monto, sube al bucket y llama la RPC, y borra el archivo si la RPC rechaza) con su `ModalEnvioComprobante` — verificación: `npx tsc -b` sin errores.
- [x] 4.4 Habilitar la revisión con `ModalRevisionComprobante` en Clientes → Deudas y en la columna Comprobante de `CobranzasPage`, con aprobación que registra el pago y pasa la cuota a `pagada` y rechazo con motivo — verificación: `npm run lint` y `npx tsc -b` sin errores; la cuota cambia de estado solo al aprobar.
- [x] 4.5 Generar la alerta "Comprobantes por revisar" en `GenerarAlertasUseCase` y el tipo `comprobante` en Alertas — verificación: `npx tsc -b` sin errores.
- [x] 4.6 Marcar en `ClientesPage` a los clientes sin correo con un alert y filtro "Ver solo esos", porque el cron los omite — verificación: `npm run lint` y `npx tsc -b` sin errores.
- [x] 4.7 Agregar el botón "Portal del cliente" que copia y abre el link público — verificación: el botón copia `/portal-cliente` al portapapeles y lo abre en pestaña nueva.
- [x] 4.8 Corregir la carga de comprobantes y pagos por empresa: `getCobranzaIdsForEmpresa` se cortaba en los primeros 1000 ids (tope de PostgREST; la empresa real tiene 3779 cuotas), así que los comprobantes de las cuotas más nuevas no aparecían en Clientes → Deudas ni en Cobranzas — verificación: `idsFrom` pagina con orden estable y `leerPorIds` manda los ids en bloques de 500 y pagina las filas; reproducido contra el proyecto real (la fila `id_comprobante = 1` de la cuota 2366 pasa de no devolverse a devolverse) y `npx tsc -b` + `npm run lint` en verde.

## 5. Aviso del resultado de la revisión al cliente

- [x] 5.1 Agregar en `lib/correo.ts` las plantillas `avisarComprobanteAprobado` y `avisarComprobanteRechazado` (monto, contrato/cuota, motivo y link al portal) — verificación: `npx tsc -b` en verde sobre `api`+`lib` (los dos errores de tipado de `nodemailer` que había en `HEAD` quedaron resueltos al enganchar `tsconfig.api.json` al build) y el texto del rechazo incluye el motivo.
- [x] 5.2 Crear `api/comprobantes/avisar.ts`: valida el access token con Auth, ubica al usuario por email, comprueba que el cliente sea de la misma empresa (cobranza → contrato → venta → cliente) y envía el correo — verificación: sin token responde 401, con token de otra empresa 403 y con el correcto 200 con `estado`; `npx tsc` sobre el archivo no acusa errores.
- [x] 5.3 Llamar al endpoint desde `useRevisionComprobante` después de aprobar o rechazar, ignorando fallos (best-effort) — verificación: la llamada va en `void avisarResultadoRevision(...)` dentro de `onSuccess`, envuelta en `try/catch` que solo hace `console.warn`.
- [x] 5.4 Documentar `api/comprobantes/avisar.ts` en `docs/cron-avisos-cuotas.md` — verificación: la sección «Correo del resultado» explica qué correo llega al aprobar y al rechazar, con el `curl` de prueba.

## 6. Verificación de integración

- [x] 6.1 Correr `npm run lint`, `npx tsc -b` y `npm run build` y confirmar que los tres terminan sin errores — verificación: los tres comandos en verde (bundle principal 2,3 MB, chunks de Word/PDF aparte).
- [x] 6.2 Recorrer el flujo completo en el entorno desplegado: contrato con Word/PDF generado y anexado, correo de cuota por vencer, subida de comprobante desde el portal, aprobación desde Cobranzas y correo de resultado — verificación: cada paso deja su registro (columna de documento, fila en `aviso_cuota`, `comprobantes.estado`, `pagos`) y los correos llegan. Nota: verificado en producción lo que no depende del cron — `contratos.documento_url`/`documento_tipo=pdf`/`documento_origen=generado` (contrato CT-033, id 38), `comprobantes` #1 en `aprobado` con `revisado_en` e `id_revisado_por=20`, `pagos` #731 (243,50) y la cobranza 1607 en `pagada`, más el correo de resultado que responde `200` con `correo: enviado` desde `/api/comprobantes/avisar`; el tramo «correo de cuota por vencer» y su fila en `aviso_cuota` dependen del cron y queda a cargo de la 3.5 (pendiente por falta de `CRON_SECRET`).
