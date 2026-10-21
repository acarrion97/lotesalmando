# Proposal

## Why

El módulo de Contratos guarda solo la fila de la venta (número y monto) sin el
documento firmado, y el módulo de Clientes no tiene ninguna forma de avisarle
al comprador que su cuota está por vencer ni de recibir la prueba de pago: la
cobranza depende de que alguien del equipo llame por teléfono y anote el pago a
mano. Sin esos dos circuitos, el cobro de las cuotas queda fuera de la
plataforma.

## What Changes

- **Documento del contrato**: cada contrato puede llevar un archivo (PDF o
  Word). Se genera con los datos que ya existen (contrato → venta → cotización
  → cliente → lote → plan de cuotas) o se anexa uno propio; se puede abrir con
  URL firmada y quitar. Todo vive en un bucket privado de Storage.
- **Aviso automático de cuotas**: un cron diario de Vercel marca como `vencida`
  toda cuota vencida y manda un correo por cuota al cliente (una vez por cuota
  y tipo de aviso, registrado en `aviso_cuota` para no repetir): "te vence en
  N días" o "ya venció", con el link al portal.
- **Portal del cliente**: página pública `/portal-cliente` que se consulta solo
  con la cédula y muestra contratos y cuotas; desde ahí el cliente sube el
  comprobante de pago (imagen o PDF) con el valor pagado.
- **Revisión del comprobante**: el comprobante queda `pendiente` y el asesor lo
  aprueba o rechaza con motivo desde Clientes → Deudas o desde la columna
  *Comprobante* de Cobranzas. Aprobar registra el pago y pasa la cuota a
  `pagada`; el motivo del rechazo se lee en el portal del cliente. Al revisarlo
  se le avisa al cliente por correo si fue aprobado o rechazado.
- **Aviso en la UI de Clientes**: los clientes sin correo se marcan en el
  listado con un alert, porque el cron los saltea y nadie se entera.
- **Configuración visible**: env vars del cron y guía de puesta en marcha en
  `.env.example` y `docs/cron-avisos-cuotas.md`; el bundle de `docx`/`jspdf`
  pasa a importarse bajo demanda para que la precarga del service worker siga
  entrando en el límite de workbox.

## Capabilities

### New Capabilities

- `contratos/documento`: documento del contrato (generado con los datos de la
  venta o anexado por el usuario), su apertura con URL firmada y su retiro.
- `clientes/avisos-cuota`: aviso por correo al cliente que compró un lote
  cuando su cuota está por vencer o ya venció, sin repetir el mismo aviso.
- `clientes/portal-comprobante`: portal público del cliente (consulta por
  cédula, envío de comprobante) y su revisión por el asesor.

### Modified Capabilities

<!-- Ningún requisito de un spec existente cambia: `clientes/contacto` sigue
     intacto; el aviso usa el correo ya cargado en la ficha del cliente. -->

## Impact

- **Base de datos (migración 035)**: columnas de documento en `contratos`,
  tablas `comprobantes` y `aviso_cuota`, buckets privados `contratos` y
  `comprobantes` con sus políticas de Storage, RPCs públicas
  `portal_cliente_por_cedula` y `portal_registrar_comprobante`.
- **Front**: `ContratosPage` + `DocumentoContratoModal`, `PortalClientePage`
  (ruta pública nueva), `ClientesPage` (alert de sin correo), `CobranzasPage`
  y `ClienteDeudasModal` (revisión de comprobantes), alertas de comprobantes
  pendientes.
- **Serverless (Vercel)**: `api/cron/cuotas-vencimiento.ts` (cron de
  `vercel.json`), `api/comprobantes/avisar.ts` (correo de resultado de la
  revisión, validado con el token de la sesión) y `lib/correo.ts` (nuevas
  plantillas de cuota y de resultado de comprobante); requiere
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` y
  `EMAIL_USER`/`EMAIL_PASS`.
- **Dependencias nuevas**: `docx` y `jspdf`, importadas de forma lazy.
