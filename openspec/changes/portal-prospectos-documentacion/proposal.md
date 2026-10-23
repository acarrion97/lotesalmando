# Proposal

## Why

Para concretar la venta de un lote se requiere reunir la documentación legal del comprador (cédula, comprobante de domicilio, RUC/certificaciones según aplique), y hoy eso se hace de forma informal (WhatsApp/correo) sin registro ni control: el asesor no sabe qué falta, el prospecto no sabe qué enviar, y no hay trazabilidad de revisión. Se replica el patrón ya probado del portal de clientes (`/portal-cliente`) para que el prospecto envíe su documentación desde un enlace público y el asesor la revise en el backoffice.

## What Changes

- Nuevo portal público `/portal-prospecto` sin sesión: el prospecto se identifica con su **email**, ve la checklist de documentos legales requeridos para la venta de un lote y sube cada archivo (imagen/PDF, límite 10 MB).
- La subida **crea o actualiza** el registro en el CRM (`prospectos`) y registra cada documento en estado `pendiente` para revisión.
- Nueva vista de **revisión en el backoffice** (módulo Prospectos): el asesor/admin aprueba o rechaza cada documento con observación obligatoria al rechazar.
- **Correo de aviso al asesor** cuando llega documentación nueva (patrón `api/comprobantes/avisar.ts` + `lib/correo.ts`), sin correos al prospecto.
- Migración SQL: bucket privado `documentos_prospectos`, RPCs `SECURITY DEFINER` para `anon` (consulta por email + registro de documentos) y tablas de control de documentos.

## Capabilities

### New Capabilities

- `prospectos/portal-documentacion`: envío público de documentación legal del prospecto por email (checklist, subida de archivos, alta/actualización en CRM) y su revisión en backoffice con aviso al asesor.

### Modified Capabilities

<!-- Ninguna capability existente cambia de requisitos: `prospectos/reserva` y las demás conservan su comportamiento. -->

## Impact

- **Base de datos (Supabase)**: nueva migración `044_*.sql` (tabla de documentos de prospecto, bucket `documentos_prospectos` + políticas `anon`, RPCs `SECURITY DEFINER`). Se ejecuta a mano en el SQL Editor (convención del repo).
- **Frontend**: nuevas rutas/páginas `src/presentation/pages/portal-prospecto/PortalProspectoPage.tsx` (ruta pública en `AppRouter.tsx`) y de revisión dentro del módulo de Prospectos; hook `usePortalProspecto.ts`; componente de subida clonado de `ModalEnvioComprobante.tsx`.
- **Dominio/aplicación**: `src/domain/portalProspecto/` (entidad + repositorio), `src/application/portalProspecto/` (casos de uso + puerto storage), registro en `create-repositories.ts` / `create-use-cases.ts` (ramas supabase y mock).
- **Correos**: nueva función en `lib/correo.ts` (aviso de documentación recibida) y endpoint `api/prospectos/avisar.ts` si sigue el patrón de token de sesión.
- **Permisos**: posiblemente un permiso nuevo de revisión en `permiso` (migración) y `permisosConfig.ts`.
- **Sin cambios breaking**: el flujo existente de prospectos, reservas y el portal de clientes quedan intactos.
