# Portal de prospectos (documentación para la venta)

Cómo queda armado y **qué hay que configurar** para que un prospecto envíe
desde un enlace público la documentación legal que se necesita para concretar
la venta de un lote, y para que el asesor la revise en el backoffice.

## 1. Base de datos (una sola vez)

Correr en el SQL Editor de Supabase (idempotente, se puede re-ejecutar):

```
supabase/migrations/044_portal_prospectos_documentacion.sql
```

Crea:

- tabla `prospecto_documento` (un documento por tipo, con estado
  `pendiente` / `aprobado` / `rechazado` y quién lo revisó),
- tabla `aviso_documento_prospecto` (evita repetir el correo al asesor),
- bucket privado `documentos_prospectos` (10 MB, solo imágenes/PDF),
- RPC públicas `portal_prospecto_por_email`, `portal_iniciar_prospecto` y
  `portal_registrar_documento` (la única puerta del portal anónimo),
- permiso `revisar_documentos_prospectos` (roles Administrador, Gerente y
  Superusuario).

## 2. Variables de entorno (Vercel)

Serverless (nada de esto es `VITE_`):

| Variable | Para qué | Obligatoria |
| --- | --- | --- |
| `SUPABASE_URL` | Conexión del endpoint al proyecto | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (nunca la anon) | sí |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail con contraseña de aplicación | sí (si faltan, el correo se omite y el envío de documentos sigue funcionando) |
| `EMAIL_FROM` | Nombre visible del que envía | no |
| `ADMIN_EMAIL` | Destino de fallback cuando el prospecto no tiene asesor | no |

Frontend (`.env` local / Vercel):

| Variable | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Conexión del portal |
| `VITE_DATA_PROVIDER` | `supabase` (producción) o `mock` (demo sin backend) |

## 3. El enlace del portal

```
https://<tu-dominio>/portal-prospecto/<slug-del-mapa>
```

El **slug es el del mapa del proyecto** (el mismo de `/mapa/:slug`): es lo
que define a qué empresa pertenece el prospecto que se registra. Se copia
desde el módulo de Mapas y se le comparte al prospecto por WhatsApp o
correo. No hace falta cuenta ni contraseña: la identificación es el email.

## 4. Flujo del prospecto (paso a paso)

1. Abre el enlace y escribe su **email** → *Continuar*.
2. Si el email ya existe en el CRM, ve su nombre y la checklist.
   Si no existe, el portal le pide **nombres y teléfono** → *Registrarme*
   (se crea el prospecto con origen `portal`; nunca se duplica si el email
   ya estaba).
3. Frente a cada documento de la checklist (cédula, comprobante de
   domicilio, acta de constitución/RUC, comprobante de ingresos) aprieta
   *Enviar* y sube una imagen (PNG/JPG/WEBP) o un PDF de hasta 10 MB.
4. El documento pasa a **En revisión**. Si el asesor lo rechaza, el portal
   muestra la observación y el prospecto puede *Reenviar* el mismo tipo de
   archivo (el reenvío pisa el anterior y vuelve a quedar en revisión).
5. Al enviar el primer documento, el portal avisa por correo al asesor
   (máximo un correo por prospecto por día).

## 5. Revisión en el backoffice

Ruta: **Prospectos → Documentación** (`/prospectos/documentacion`), requiere
el permiso `revisar_documentos_prospectos` (lo tienen Administrador, Gerente
y Superusuario; se otorga también desde Roles y permisos).

- El listado muestra el prospecto, el documento, la fecha y el estado, con
  filtro y contador de pendientes.
- *Aprobar* marca el documento `aprobado` con revisor y fecha.
- *Rechazar* **exige una observación**; el prospecto la verá en el portal.
- Desde la ficha de Prospectos hay un indicador con el estado de su
  documentación.

## 6. Checklist legal (cómo cambiarla)

La lista vive en un solo lugar:
`src/domain/portalProspecto/entities/PortalProspecto.ts`
(constante `DOCUMENTOS_REQUERIDOS`). Si hay que agregar o renombrar un
documento:

1. Actualizar la constante (tipo, nombre visible, descripción).
2. Actualizar el CHECK de `prospecto_documento` y la lista de validación de
   `portal_registrar_documento` en `supabase/migrations/044_*.sql` (o crear
   una migración nueva 045 que agregue el valor al CHECK).

Antes de difundir el enlace, **confirmar con asesoría legal** la lista
exacta para el tipo de comprador (persona natural vs. jurídica).

## 7. Prueba rápida en local

```bash
VITE_DATA_PROVIDER=mock npm run dev
# Abrir http://localhost:5173/portal-prospecto/prueba
```

En modo mock todo funciona en memoria (alta, envío, revisión) sin tocar
Supabase ni enviar correos. Para probar el circuito completo con base de
datos y correo, usar el entorno de Vercel con la migración 044 ejecutada.

## 8. Seguridad

- El portal anónimo solo habla con las tres RPC `SECURITY DEFINER`; nunca
  consulta `prospectos` ni `prospecto_documento` a mano.
- Los archivos viven en el bucket **privado** `documentos_prospectos`; el
  anon solo puede **subir** dentro de carpetas `prospecto-<id>/`.
- La RPC de registro valida que el `id_prospecto` le pertenezca al email
  presentado.
- El backoffice lee con URLs firmadas de 1 hora; la tabla tiene RLS
  acotada por empresa.
