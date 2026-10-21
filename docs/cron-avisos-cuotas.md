# Aviso de cuotas y comprobantes (cron + portal)

Cómo queda armado y **qué hay que configurar** para que un cliente que compró
un lote sea avisado cuando su cuota está por vencer o ya venció, y pueda
enviar el comprobante de pago.

## 1. Base de datos (una sola vez)

Correr en el SQL Editor de Supabase:

```
supabase/migrations/035_contratos_documentos_comprobantes.sql
```

Crea:

- columnas de documento en `contratos` (para **anexar** o generar el contrato),
- tabla `comprobantes` (prueba de pago subida desde el portal),
- tabla `aviso_cuota` (evita repetir el mismo correo cada día),
- buckets privados `contratos` y `comprobantes`,
- RPC públicas `portal_cliente_por_cedula` y `portal_registrar_comprobante`
  (la única puerta del portal anónimo).

## 2. Variables de entorno (Vercel)

En **Settings → Environment Variables** (serverless, nada de esto es `VITE_`):

| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `SUPABASE_URL` | Conexión del cron al proyecto | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (nunca la anon) | sí |
| `CRON_SECRET` | Seguridad del endpoint del cron | sí |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail con contraseña de aplicación | sí (si faltan, los correos se omiten y el cron sigue corriendo) |
| `EMAIL_FROM` | Nombre visible del que envía | no |
| `APP_URL` | Base del link al portal (por defecto `https://lotesalmando.com`) | no |
| `DIAS_AVISO_CUOTA` | Días de anticipación del aviso (5) | no |
| `ADMIN_EMAIL` | Aviso de pagos de Hotmart sin cuenta | no |

El mismo listado está en `.env.example`.

## 3. El cron

`vercel.json` dispara `api/cron/cuotas-vencimiento.ts` **todos los días a las
8:00 UTC (03:00 de Ecuador)**. También se puede llamar a mano:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://lotesalmando.com/api/cron/cuotas-vencimiento
```

Orden de lo que hace:

1. pasa a `vencida` toda cuota pendiente cuya fecha ya pasó;
2. manda **un** correo por cuota a los clientes cuya cuota vence en los
   próximos N días (`por_vencer`) o que ya venció (`vencida`);
3. registra el aviso en `aviso_cuota` para no repetirlo mañana.

No se le reclama a quien ya subió un comprobante (pendiente o aprobado), y los
clientes sin correo quedan en `omitidos` (la pantalla de Clientes avisa quiénes
son).

## 4. El portal del cliente

- Link público: `/portal-cliente` (botón **Portal del cliente** en Clientes,
  que lo copia y lo abre).
- El cliente entra solo con su cédula: ve sus contratos, sus cuotas y sube el
  comprobante (imagen o PDF, hasta 10 MB) con el valor que pagó.
- El comprobante queda **pendiente**; lo aprueba o rechaza el asesor desde
  **Clientes → Deudas** o desde la columna *Comprobante* de **Cobranzas**.
  Aprobar registra el pago y pasa la cuota a `pagada`; el rechazo con motivo se
  ve en el portal del cliente.

### Correo del resultado (aprobar / rechazar)

Al revisar un comprobante, `useRevisionComprobante` llama en segundo plano a
`api/comprobantes/avisar.ts` con el **access token de la sesión del asesor**.
El endpoint:

1. valida el token con Supabase Auth y ubica al usuario por su email
   (401 si falta o venció; 403 si el usuario no tiene empresa);
2. sigue la cadena **comprobante → cobranza → contrato → venta → cliente** y
   comprueba que el cliente sea de la misma empresa (403 si es de otra);
3. manda el correo: **"Tu comprobante fue aprobado"** (la cuota ya figura como
   pagada) o **"Tu comprobante fue rechazado"** con el motivo, para que el
   cliente vuelva a enviarlo desde el portal.

Es *best effort*: si algo falla, la revisión ya quedó guardada y el correo se
omite (el asesor nunca ve un error por esto). Usa las mismas variables de
entorno que el cron (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_*`,
`APP_URL`). Prueba manual desde una sesión del backoffice:

```bash
curl -X POST https://lotesalmando.com/api/comprobantes/avisar \
  -H "Authorization: Bearer <access_token de la sesión>" \
  -H "Content-Type: application/json" \
  -d '{"idComprobante": 1}'
```

Esperado: `{"ok":true,"correo":"enviado","estado":"aprobado"}` (o `"omitido"`
si el cliente no tiene correo).

## 5. Documentos de contrato

En **Contratos → Administrar** se puede generar el Word o el PDF con los datos
de la venta o **anexar** un archivo propio (PDF/`.docx`, hasta 10 MB). El
archivo vive en el bucket privado `contratos` y se abre con URL firmada de una
hora.
