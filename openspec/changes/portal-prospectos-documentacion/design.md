# Design

## Context

Ver `proposal.md` (Why). El repositorio ya tiene un precedente probado de portal anónimo: `/portal-cliente` (migración `035`, RPCs `SECURITY DEFINER` con rol `anon`, bucket privado `comprobantes`, subida con `Upload.Dragger`, revisión en backoffice y correo vía `api/comprobantes/avisar.ts` + `lib/correo.ts`). También existe un precedente de escritura anónima en el CRM: RPC `mapa_publico_registrar_interes(p_slug, ...)` (migración `018`) que resuelve la empresa a partir del slug de proyecto y crea/reutiliza prospectos. El CRM de prospectos ya está completo (`prospectos`, `oportunidades`, estados del pipeline, permisos `ver_prospectos`...).

## Goals / Non-Goals

**Goals:**

- Portal público `/portal-prospecto` sin sesión, identificado por email, que replica la arquitectura del portal de clientes (clean architecture + DI + React Query).
- Checklist de documentación legal para la venta de un lote con estados trazables (pendiente → revisión → aprobado/rechazado).
- Integración con el CRM existente: alta/reutilización del prospecto, sin duplicados.
- Revisión en backoffice dentro del módulo Prospectos + aviso por correo al asesor.

**Non-Goals:**

- Seleccionar lote/etapa desde el portal (la oportunidad y el lote se siguen gestionando en el CRM, ver spec `prospectos/reserva`).
- Correos al prospecto, firma digital, generación de contrato o validación de identidad con cédula.
- Versionado histórico de archivos (cada reenvío reemplaza el archivo anterior).
- Modificar el portal de clientes o los flujos de reservas/ventas existentes.

## Decisions

### D1. Identificación por email + scoping de empresa por slug de proyecto

El prospecto ingresa su email. Como `prospectos.id_empresa` es NOT NULL y el portal no tiene sesión que defina la empresa, el enlace del portal lleva el **slug del proyecto** (`/portal-prospecto/:slug`, igual que `/mapa/:slug`): la empresa se resuelve a partir del slug y la búsqueda/creación de prospectos queda scoped a esa empresa (evita duplicados cross-tenant y fuga de datos entre empresas).

- *Alternativa descartada*: portal global sin slug → no hay forma de saber en qué empresa crear el prospecto.
- *Alternativa descartada*: token por prospecto generado por el asesor → más seguro pero añade gestión de expiración; el email + la revisión humana del asesor dan control suficiente en v1 (misma filosofía que la cédula en el portal de clientes).

### D2. RPCs `SECURITY DEFINER` con rol `anon` (migración `044_portal_prospectos_documentacion.sql`)

- `portal_prospecto_por_email(p_slug, p_email)`: resuelve empresa por slug, busca el prospecto por email dentro de esa empresa y devuelve `{prospecto, documentos[]}` (o `prospecto: null` para que el front pida nombres/teléfono).
- `portal_iniciar_prospecto(p_slug, p_email, p_nombres, p_teléfono)`: crea el prospecto (`origen='portal'`, `estado='nuevo'`) si no existe y devuelve su id. Dedupe por email dentro de la empresa.
- `portal_registrar_documento(p_email, p_id_prospecto, p_tipo, p_path, p_nombre)`: valida pertenencia (email ↔ id_prospecto), tipo ∈ checklist, y hace upsert del documento en estado `pendiente`. Devuelve `{ok, error?}` como `portal_registrar_comprobante`.
- `GRANT EXECUTE ... TO anon, authenticated` solo a estas funciones (patrón migración 035).

### D3. Tabla `prospecto_documento` con RLS

```sql
prospecto_documento(
  id_documento BIGSERIAL PK,
  id_prospecto INT NOT NULL REFERENCES prospectos ON DELETE CASCADE,
  id_empresa INT NOT NULL REFERENCES empresa,
  tipo VARCHAR(40) NOT NULL,          -- 'cedula' | 'comprobante_domicilio' | 'constitucion' | 'comprobante_ingresos'
  archivo_path TEXT NOT NULL,          -- path en bucket
  archivo_nombre VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente','aprobado','rechazado')),
  nota_revision TEXT,
  id_revisado_por INT REFERENCES usuario,
  revisado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ DEFAULT now(),
  UNIQUE (id_prospecto, tipo)
)
```

RLS habilitada **sin policy** (solo service_role + RPCs definer), siguiendo la convención de las tablas nuevas (028/031/043). `UNIQUE(id_prospecto, tipo)` implementa "un documento por tipo" (D5). También tabla `aviso_documento_prospecto(id_prospecto, fecha)` con `UNIQUE` para idempotencia del correo (patrón `aviso_cuota` de la migración 035).

### D4. Storage: bucket privado `documentos_prospectos`

- Bucket privado, `file_size_limit=10485760`, `allowed_mime_types=['image/png','image/jpeg','image/webp','application/pdf']`.
- Path: `prospecto-<id_prospecto>/<timestamp>-<nombre>`.
- Policy `INSERT TO anon` con `CHECK (bucket_id='documentos_prospectos' AND (storage.foldername(name))[1] LIKE 'prospecto-%')`; `SELECT`/`DELETE` solo `authenticated` (patrón literal de `035:107-144`).
- Puerto `PortalProspectoStorage` con `validarArchivoDocumento()`, `LIMITE_DOCUMENTO_BYTES`, `upload/firmarUrl/removeByPath`; implementaciones `Supabase...` y `Mock...` (reutiliza la lógica de `SupabaseComprobanteStorage.ts`).

### D5. Un documento por tipo, reenvío sobrescribe

Si el tipo ya tiene registro, el reenvío hace UPDATE de archivo y vuelve a `pendiente` (limpia nota/revisor). El prospecto puede reenviar un documento rechazado. *Alternativa descartada*: versionado completo — aporta poco en v1 y complica la checklist.

### D6. Checklist en código (constante del dominio)

`DOCUMENTOS_REQUERIDOS` como constante en `src/domain/portalProspecto/` (tipo, nombre visible, descripción): cédula de identidad (frente/reverso en un PDF o dos imágenes… un registro), comprobante de domicilio, acta de constitución/RUC (persona jurídica), comprobante de ingresos. Es la fuente de verdad que alimenta la checklist del portal y valida la RPC (paso `p_tipo` por la misma lista). *Alternativa descartada*: tabla en BD — sobre-ingeniería para v1; moverlo a BD después no cambia comportamiento observable.

### D7. Casos de uso y DI (patrón exacto del portal de clientes)

- `ConsultarPortalProspectoUseCase` → `rpc(portal_prospecto_por_email)`.
- `IniciarProspectoPortalUseCase` → `rpc(portal_iniciar_prospecto)`.
- `RegistrarDocumentoPortalUseCase` → validar archivo → `storage.upload({carpeta: prospecto-<id>})` → `rpc(portal_registrar_documento)` → si falla `storage.removeByPath(path)` (limpieza de huérfanos, como `RegistrarComprobantePortalUseCase.ts:61-63`).
- `RevisarDocumentoProspectoUseCase` (backoffice) → update estado + revisor (repo autenticado normal).
- Registrados en `create-repositories.ts` y `create-use-cases.ts` (ramas supabase **y** mock), hooks `usePortalProspecto.ts` y `useDocumentosProspecto.ts`.

### D8. Aviso al asesor sin sesión (decisión clave respecto al patrón)

`api/comprobantes/avisar.ts` se autentica con el token de la sesión backoffice, pero quien envía documentos aquí es un anónimo. Por eso `POST /api/prospectos/avisar` recibe `{slug, email}` y usa `service_role` para:

1. Resolver empresa por slug → prospecto por email.
2. Exigir que exista al menos un documento `pendiente` creado en los últimos 15 minutos.
3. Idempotencia: insertar en `aviso_documento_prospecto (id_prospecto, fecha_hoy)` — si el UNIQUE ya existe, responder 200 sin enviar (máx. 1 correo/día/prospecto).
4. Destinatario: email del `id_asesor` del prospecto (join `usuario`) o fallback `EMAIL_FROM`/`ADMIN_EMAIL`.
5. Nueva función `avisarDocumentacionProspecto()` en `lib/correo.ts` (nunca lanza; `"omitido"` sin credenciales).

El front lo llama solo cuando la subida fue exitosa (best-effort, sin bloquear).

### D9. Revisión en backoffice: ruta `/prospectos/documentacion`

Página con `DataTable` (filtros por estado, conteo de pendientes) + `ModalRevisionProspecto` clonado de `ModalRevisionComprobante` (aprobar / rechazar con nota obligatoria). Dentro del `AppLayout` con `permisoParaRuta`, bajo un permiso nuevo `revisar_documentos_prospectos` (migración: `INSERT ... ON CONFLICT DO NOTHING` + asignación a Administrador/Gerente/Superusuario, patrón 024/025) y entrada en `permisosConfig.ts` + `GRUPOS_MENU`. Ver spec (requerimiento "Sin permiso de revisión").

### D10. Portal como clon estructural de `PortalClientePage`

Misma UI/UX: paso 1 consulta por email, paso 2 checklist con `Upload.Dragger` por tipo (clon de `ModalEnvioComprobante.tsx`), estados de React Query con `queryKey: ["portalProspecto", slug, email]`. Ruta registrada **fuera** de `AppLayout` en `AppRouter.tsx`.

## Risks / Trade-offs

- [Abuso del rol `anon` (spam de prospectos/documentos)] → RPCs mínimos con validación estricta de parámetros, bucket con carpeta restringida, idempotencia de correos 1/día; precedente aceptado con `mapa_publico_registrar_interes` y el portal de clientes.
- [Email como identidad: alguien puede enviar documentos a nombre de otro] → no hay verificación de identidad (mismo riesgo aceptado en portal de clientes con cédula); la revisión humana del asesor es el control final.
- [Archivos huérfanos si falla el registro] → `removeByPath` en el caso de uso (patrón existente).
- [Checklist legal incompleta o desactualizada] → constante única editable; revisión con asesoría legal antes de difundir el enlace (ver Open Questions).
- [Migración manual sin CLI de Supabase] → migración idempotente `044_` ejecutada a mano en el SQL Editor (convención del repo); rollback benigno (tablas/bucket sin consumidores si se revierte el front).

## Migration Plan

1. Ejecutar `supabase/migrations/044_portal_prospectos_documentacion.sql` en el SQL Editor (idempotente: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS`).
2. Desplegar el front (Vercel) con la nueva ruta y módulo de revisión.
3. Configurar/verificar credenciales SMTP (`EMAIL_USER/EMAIL_PASS/EMAIL_FROM`, `ADMIN_EMAIL`).
4. Compartir el enlace `/portal-prospecto/<slug-proyecto>` con los prospectos.
5. Rollback: revertir el deploy front (la ruta desaparece); tablas, bucket y RPCs pueden quedarse sin efecto.

## Open Questions

- Confirmar con asesoría legal la checklist exacta y si algún documento varía por tipo de comprador (persona natural vs. jurídica) — la constante `DOCUMENTOS_REQUERIDOS` absorbe el cambio sin tocar specs ni arquitectura.
- Si más adelante se quiere aviso en tiempo real al asesor (no 1/día), ampliar la idempotencia de `aviso_documento_prospecto`.
