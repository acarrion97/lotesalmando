# Tasks

## 1. Base de datos (migración 044)

- [ ] 1.1 Crear `supabase/migrations/044_portal_prospectos_documentacion.sql` con tabla `prospecto_documento` (CHECK de estado, `UNIQUE(id_prospecto,tipo)`), tabla `aviso_documento_prospecto` con `UNIQUE(id_prospecto, fecha)` y RLS habilitada sin policy — Verificar: el archivo existe y es idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`); al ejecutarlo dos veces seguidas en el SQL Editor de Supabase no produce errores.
- [ ] 1.2 Agregar en la migración el bucket privado `documentos_prospectos` (10 MB, MIME image/png, image/jpeg, image/webp, application/pdf) con policy `INSERT TO anon` limitada a carpetas `prospecto-%` y `SELECT`/`DELETE` solo `authenticated` — Verificar: ejecutar en el SQL Editor; desde el navegador con la anon key, subir un archivo fuera de `prospecto-*` falla y el bucket aparece privado en el dashboard.
- [ ] 1.3 Agregar las RPCs `portal_prospecto_por_email(p_slug,p_email)`, `portal_iniciar_prospecto(p_slug,p_email,p_nombres,p_telefono)` y `portal_registrar_documento(p_email,p_id_prospecto,p_tipo,p_path,p_nombre)` como `SECURITY DEFINER` con `GRANT EXECUTE ... TO anon, authenticated` (patrón migración 035) — Verificar: llamar cada RPC desde el SQL Editor con `SET ROLE anon` y comprobar: devuelve prospecto null para email nuevo, crea prospecto sin duplicar en email repetido y rechaza un `p_tipo` fuera de la checklist.
- [ ] 1.4 Agregar en la migración el permiso `revisar_documentos_prospectos` (módulo prospectos) con `ON CONFLICT DO NOTHING` y asignación a Administrador, Gerente y Superusuario (patrón 024/025) — Verificar: `SELECT * FROM permiso WHERE nombre_permiso='revisar_documentos_prospectos'` retorna fila y los roles asignados esperados.

## 2. Dominio y aplicación

- [ ] 2.1 Crear `src/domain/portalProspecto/` con entidad `PortalProspecto` (tipo `PortalProspectoEstado`, tipos de documento), constante `DOCUMENTOS_REQUERIDOS` (tipo, nombre visible, descripción) y `repositories/PortalProspectoRepository.ts` con `getByEmail`, `iniciarProspecto` y `registrarDocumento` — Verificar: `npm run build` compila y la lista de tipos coincide con el CHECK de la migración.
- [ ] 2.2 Crear `src/application/portalProspecto/ports/PortalProspectoStorage.ts` con `LIMITE_DOCUMENTO_BYTES` (10 MB), `validarArchivoDocumento(file)` (mime imagen/PDF + tamaño) y la interfaz `upload/firmarUrl/removeByPath` — Verificar: `npm run build` compila; la validación rechaza un `.txt` y un archivo de 11 MB, y acepta PDF/PNG/JPEG/WEBP < 10 MB.
- [ ] 2.3 Crear los casos de uso `ConsultarPortalProspectoUseCase`, `IniciarProspectoPortalUseCase` y `RegistrarDocumentoPortalUseCase` (validar → upload a `prospecto-<id>` → RPC → `removeByPath` si la RPC falla, patrón `RegistrarComprobantePortalUseCase`) — Verificar: `npm run build` compila y el caso de uso de registro limpia el archivo huérfano cuando la RPC devuelve `{ok:false}` (revisar el flujo con provider mock).
- [ ] 2.4 Crear esquema Zod `src/presentation/validations/portalProspectoSchema.ts` (email válido, nombres y teléfono requeridos en el alta) — Verificar: `npm run build` y `npm run lint` pasan; un email sin `@` muestra error de validación en el formulario.

## 3. Infraestructura y DI

- [ ] 3.1 Crear `SupabasePortalProspectoRepository.ts` con las tres llamadas `supabase.rpc(...)` y `MockPortalProspectoRepository.ts` equivalente — Verificar: `npm run build` compila; con `VITE_DATA_PROVIDER=mock` la consulta por email devuelve datos de prueba.
- [ ] 3.2 Crear `SupabasePortalProspectoStorage.ts` (bucket `documentos_prospectos`, carpeta sanitizada `prospecto-<id>`, URL firmada 1 h) y `MockPortalProspectoStorage.ts` (patrón `SupabaseComprobanteStorage.ts`) — Verificar: `npm run build` compila; subida de prueba en Supabase queda en la carpeta correcta y la URL firmada expira.
- [ ] 3.3 Registrar repositorio y storage en `create-repositories.ts` (ramas supabase **y** mock) y los casos de uso en `create-use-cases.ts` — Verificar: `npm run build`; el contenedor resuelve los nuevos casos de uso sin errores en runtime (carga de la app con ambas ramas del provider).

## 4. Portal público `/portal-prospecto/:slug`

- [ ] 4.1 Crear `src/presentation/hooks/usePortalProspecto.ts` con las mutaciones/queries (queryKey `["portalProspecto", slug, email]`) sobre el contenedor DI — Verificar: `npm run build` y `npm run lint` pasan.
- [ ] 4.2 Crear el componente de subida `src/presentation/components/publicos/UploadDocumentoProspecto.tsx` clonando `ModalEnvioComprobante.tsx` (Dragger, validación del puerto, mensajes antd) — Verificar: `npm run build`; en la página, subir un archivo inválido muestra el motivo y no dispara la mutación.
- [ ] 4.3 Crear `src/presentation/pages/portal-prospecto/PortalProspectoPage.tsx`: paso 1 consulta por email (o alta con nombres/teléfono si no existe), paso 2 checklist con estado por documento (pendiente de enviar, en revisión, aprobado, rechazado con observación) — Verificar: `npm run build`; flujo manual: email nuevo → alta → envío → el documento aparece "en revisión" al recargar.
- [ ] 4.4 Registrar la ruta pública `/portal-prospecto/:slug` **fuera** de `AppLayout` en `src/app/router/AppRouter.tsx` — Verificar: `npm run build`; navegar a la URL muestra el portal sin login y el resto de rutas sigue funcionando.
- [ ] 4.5 Documentar el flujo y el reparto del enlace en `docs/portal-prospectos.md` (paso a paso prospecto → asesor, como `docs/cron-avisos-cuotas.md`) — Verificar: seguir la guía literalmente en dev reproduce el flujo completo.

## 5. Revisión en backoffice

- [ ] 5.1 Crear `SupabaseDocumentoProspectoRepository.ts` (listado por empresa con datos del prospecto, aprobar/rechazar con `id_revisado_por`) y `RevisarDocumentoProspectoUseCase` (rechazo exige nota) — Verificar: `npm run build`; con provider mock, revisar cambia el estado y el rechazo sin nota es impedido.
- [ ] 5.2 Crear `src/presentation/hooks/useDocumentosProspecto.ts` (queryKey `["documentosProspecto", empresaId]` con invalidación) y `ModalRevisionProspecto.tsx` clon de `ModalRevisionComprobante` — Verificar: `npm run build` y `npm run lint` pasan.
- [ ] 5.3 Crear `src/presentation/pages/prospectos/DocumentosProspectoPage.tsx` con `DataTable` (filtros por estado, badge de pendientes) y registrarla como `/prospectos/documentacion` con `permisoParaRuta` + permiso `revisar_documentos_prospectos` en `permisosConfig.ts` (incluida en `GRUPOS_MENU`) — Verificar: `npm run build`; como Administrador la ruta abre; con un usuario sin el permiso, `ProtectedRoute` redirige.
- [ ] 5.4 Mostrar desde `ProspectosPage` un indicador/enlace a la documentación del prospecto (estados de sus documentos) — Verificar: `npm run build`; en dev, un prospecto con documentos pendientes muestra el indicador y el enlace llega a la revisión.

## 6. Aviso de correo al asesor

- [ ] 6.1 Agregar `avisarDocumentacionProspecto()` en `lib/correo.ts` (plantilla con nombre del prospecto y documentos recibidos, nunca lanza, `"omitido"` sin credenciales) — Verificar: `npm run lint`; llamada de prueba devuelve `"omitido"` sin credenciales y envía el correo con credenciales.
- [ ] 6.2 Crear `api/prospectos/avisar.ts` (POST `{slug,email}` con `service_role`: valida empresa→prospecto, exige documento `pendiente` creado en los últimos 15 min, idempotencia diaria vía `aviso_documento_prospecto`, destinatario = email del asesor o `ADMIN_EMAIL`) — Verificar: segunda llamada el mismo día responde 200 sin enviar correo; sin documentos recientes responde 404/409.
- [ ] 6.3 Llamar al endpoint best-effort desde el portal tras una subida exitosa (no bloquea el envío) — Verificar: en dev, enviar documentos dispara exactamente un correo al asesor por día aunque se suban varios archivos.

## 7. Verificación e integración

- [ ] 7.1 Ejecutar `npm run build` y `npm run lint` sin errores en todo el proyecto — Verificar: ambos comandos terminan con código 0.
- [ ] 7.2 Recorrer el flujo E2E en dev: portal con slug → email nuevo → alta → subir los 4 tipos de documento → backoffice los lista → aprobar uno y rechazar otro con nota → el portal muestra ambos estados con la observación → el asesor recibió un solo correo — Verificar: cada paso observado coincide con los escenarios de `specs/prospectos/portal-documentacion/spec.md`.
- [ ] 7.3 Verificar aislamiento y seguridad: con la anon key, un email ajeno no ve documentos de otro prospecto, la subida fuera de `prospecto-*` es denegada y un usuario sin `revisar_documentos_prospectos` no puede revisar — Verificar: pruebas manuales contra Supabase devuelven los errores esperados.
