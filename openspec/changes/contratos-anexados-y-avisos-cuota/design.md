# Design

## Context

Ver `proposal.md` (Why) y los tres deltas de este cambio. Lo que condiciona el
diseño:

- No hay backend propio: el front es una SPA en Vercel y las dos funciones
  serverless existentes son `api/hotmart-webhook.ts` y el cron nuevo. La
  autenticación del backoffice es Supabase Auth con la anon key desde el
  navegador.
- El portal del cliente debe funcionar **sin cuenta**, así que no puede pasar
  por la sesión del backoffice ni por las políticas de RLS por usuario (el
  proyecto además corrió 008 deshabilitando RLS de forma global).
- Los documentos de contrato y los comprobantes traen datos personales del
  comprador: no pueden quedar en buckets públicos.
- El mismo patrón ya existe en el repo: RPCs `SECURITY DEFINER` para lo público
  (migración 010/018) y puertos de infraestructura con implementación Supabase
  y Mock (clean architecture en `src/application` + `src/infrastructure`).

## Goals / Non-Goals

**Goals:**

- Que el circuito completo (cuota por vencer → correo → portal → comprobante →
  aprobación → cuota pagada) funcione en producción con cero intervención
  manual, y que el archivo de cada contrato esté disponible desde Contratos.
- Que nada del flujo dependa de datos que el usuario tenga que volver a cargar:
  todo se deriva de la cadena contrato → venta → cotización → cliente → lote.

**Non-Goals:**

- Login de cliente con cuenta propia o Magic Link (la cédula alcanza y es lo
  que ya tienen los contratos).
- Cobro en línea (pasarela de pago): solo se recibe la prueba de lo pagado.
- Firma digital del contrato con certificado: el documento se genera/anexa, la
  firma sigue siendo presencial.
- Notificación al cliente cuando su comprobante es aprobado/rechazado por
  correo: hoy se ve al entrar al portal; puede sumarse después sin tocar specs.

## Decisions

**1. Portal anónimo vía RPC `SECURITY DEFINER`, no RLS por usuario.**
Alternativas: RLS con `auth.uid()` (imposible: no hay sesión de cliente), link
firmado con token de larga vida (hay que emitirlo, revocarlo y expirarlo) y
RPC. Se eligió la RPC porque es el patrón ya usado en `mapa_publico`, deja un
único punto de auditoría (`portal_cliente_por_cedula`,
`portal_registrar_comprobante`) y valida dentro de la base que la cuota le
pertenezca a quien presenta la cédula.

**2. Los archivos van en buckets privados con permisos por carpeta.**
`comprobantes` acepta INSERT de `anon` solo dentro de `cobranza-<id>/`, de modo
que un visitante no puede pisar la prueba de otra cuota; `contratos` solo
recibe de `authenticated`. La lectura en backoffice es con URL firmada de una
hora. Alternativa descartada: bucket público (cualquiera con la URL vería los
datos del comprador).

**3. El cron corre en Vercel (`vercel.json` → `api/cron/...`) con
`service_role`, no en el navegador.**
Es la única pieza que necesita permisos de escritura global y credenciales de
SMTP. Usa `CRON_SECRET` en el header Authorization (lo manda Vercel) y un
cliente Supabase sin sesión. La idempotencia vive en la tabla `aviso_cuota`
con `UNIQUE (id_cobranza, tipo)`: si se pierde el registro se reenvía, nunca
se envía dos veces por el mismo registro.

**4. La aprobación del comprobante reutiliza el registro de pago existente.**
`AprobarComprobanteUseCase` hace lo mismo que el modal de pago manual (pago +
`cobranzas.estado = pagada`) pero parte del monto que declaró el cliente; la
cuota nunca cambia por el solo hecho de subir la prueba. Alternativa descartada:
que la RPC marque la cuota como pagada al subir (el cliente podría declarar
cualquier monto).

**5. El documento del contrato se arma en el navegador con una estructura
intermedia.**
`estructuraContrato` produce bloques (título, párrafo, tabla) y dos generadores
los dibujan en Word y PDF. Así el texto se define una sola vez y no hay que
subir un archivo para tener el contrato. `docx` y `jspdf` se importan de forma
lazy: pesan ~1 MB juntos y solo se cargan cuando alguien pide generar; si
entraran en el bundle principal superarían el límite de precarga de workbox
(3 MiB) y romperían el arranque sin conexión.

**6. Revisión del comprobante en dos pantallas con el mismo componente.**
Clientes → Deudas (por cliente) y Cobranzas (por cuota) comparten
`ModalRevisionComprobante`; así el que cobra no depende de entrar a Clientes.

**7. El correo de resultado lo manda una función serverless, no el navegador.**
El navegador no puede hablar SMTP, y mover la aprobación al servidor obligaría
a rediseñar el flujo completo. Se agregó `api/comprobantes/avisar.ts`: recibe
`idComprobante` + el access token de la sesión, valida el JWT con Auth, ubica
al `usuario` por su email (la misma llave que usa `usuario`), comprueba que el
cliente pertenezca a la misma empresa a través de cobranza → contrato → venta →
cliente, y recién ahí envía. Alternativas descartadas: cola de avisos con cron
horario (hasta 1 h de demora y una tabla más) y endpoint con `CRON_SECRET`
compartido con el front (el secreto quedaría en el bundle).

**8. El aviso es best-effort.**
Si el endpoint no existe (dev local) o el correo falla, la revisión ya ocurrió:
el error se ignora y el estado del comprobante es el de la base. El cliente
siempre puede verlo en su portal.

## Risks / Trade-offs

- [La cédula es la única llave del portal] → Cualquiera que conozca una cédula
  ve sus cuotas. Mitigación: solo se devuelven contratos y cuotas (nada de
  contraseña ni datos de otros clientes), el portal no indexa rutas con la
  cédula y se puede exigir HTTPS/CSP como ya hace el dominio. Si hace falta
  más, se agrega un segundo factor sin cambiar el flujo.
- [Los clientes sin correo no reciben nada] → El cron los omite; el listado de
  Clientes los marca con un alert para completar el dato.
- [Si faltan `EMAIL_USER`/`EMAIL_PASS` no se avisa nadie] → El cron responde
  `omitidos` y sigue andando; se documenta en `.env.example` y en
  `docs/cron-avisos-cuotas.md`.
- [Si la migración 035 no se corre, el portal y el cron fallan] → Las columnas
  y tablas nuevas son la base de todo: es el primer paso del plan de migración.
- [Varios cientos de correos en una sola ejecución] → El límite por función de
  Vercel es 300 s; si la cartera crece, conviene partir el aviso por lotes
  (pregunta abierta).

## Migration Plan

1. Correr `supabase/migrations/035_contratos_documentos_comprobantes.sql`
   (idempotente: agrega columnas, tablas, buckets, políticas y RPCs).
2. Definir en Vercel `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `CRON_SECRET`, `EMAIL_USER`, `EMAIL_PASS` (y opcionales `APP_URL`,
   `DIAS_AVISO_CUOTA`, `EMAIL_FROM`); verificar el cron con un `curl` y el
   header `Authorization`.
3. Desplegar el front (build con los generadores en chunks lazy).
4. Verificación: generar un Word/PDF de un contrato, anexar uno propio,
   entrar al portal con una cédula real, subir un comprobante y aprobarlo desde
   Cobranzas, comprobar que la cuota pasa a `pagada`.
5. Rollback: revertir el deploy; la migración no borra datos y las columnas
   nuevas quedan inertes si la app vieja vuelve.

## Open Questions

- Si la cartera supera los cientos de cuotas vencidas por día, partir el cron
  en lotes; el registro `aviso_cuota` ya lo permite sin duplicar envíos.

Resuelta: el correo de resultado de la revisión **sí entra** en este cambio
(decisión 7), no queda pendiente.
