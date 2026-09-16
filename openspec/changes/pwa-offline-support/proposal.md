## Why

Los asesores comerciales usan Lotes al Mando en terreno (visitas a proyectos de lotización), donde la conectividad es intermitente o nula. Hoy la aplicación no es instalable y no funciona en absoluto sin red: no hay manifest, service worker, ni persistencia de datos consultados previamente. Esto bloquea el caso de uso principal de campo — mostrarle a un cliente el inventario de lotes mientras están parados en el terreno — y contradice el posicionamiento del producto de dar "control y decisiones con información confiable" si la única alternativa sin señal es una pantalla en blanco.

Se separa de `lotes-al-mando-prototype` porque introduce una capacidad transversal (almacenamiento local, aislamiento multi-tenant, reglas de escritura, UX de conectividad) que no formaba parte del alcance original — el design.md de ese change excluye explícitamente app móvil nativa pero no contempló PWA/offline. La implementación espera a que el prototipo base cierre su código para no perseguir un objetivo en movimiento, pero la propuesta y el diseño se fijan ahora porque una decisión clave (namespacing de `empresaId` en las query keys) debe quedar especificada antes de que se agregue persistencia, para no tener que corregirla después con datos ya cacheados en producción.

## What Changes

- Agregar shell de PWA instalable: `manifest.json`, iconos, `theme-color`, y un Service Worker generado con `vite-plugin-pwa` (`generateSW`) que precachea únicamente los assets de build (JS/CSS/fuentes/iconos) — sin `runtimeCaching` para llamadas a Supabase.
- Agregar persistencia selectiva del cache de TanStack Query (`persistQueryClient` + almacenamiento en IndexedDB) limitada a las consultas de inventario: proyectos, etapas, manzanas, lotes y datos del mapa.
- **BREAKING (interno)**: las query keys de los hooks de inventario multi-empresa (`useProyectos`, `useEtapas`, `useManzanas`, `useLotes`, `useLotesByManzana`, `useEtapasByProyecto`, `useManzanasByEtapa`) deben incluir `empresaId` (ej. `["lotes"]` → `["lotes", empresaId]`). Es un prerrequisito de seguridad para la persistencia, no una mejora opcional.
- Agregar indicador visible de conectividad y antigüedad del dato (fresco <15 min / desactualizado 15–60 min / muy desactualizado >60 min), y tratar la disponibilidad/precio cacheados como "así estaba la última vez que se consultó", nunca como estado garantizado actual.
- Bloquear operaciones comerciales y financieras (reservar, vender, cotizar, registrar pago) cuando no hay conexión, mostrando mensaje explícito; Supabase sigue siendo la única fuente de verdad para confirmar cualquier compromiso comercial.
- Purgar el cache persistido en `logout` y en cambio de empresa activa, para evitar que datos de una empresa queden legibles en IndexedDB tras cambiar de tenant o de usuario en el mismo dispositivo.
- Manejar actualizaciones del Service Worker de forma controlada (prompt "nueva versión disponible"), no aplicación silenciosa de un build viejo.
- Fuera de alcance explícito de este change: sincronización bidireccional / cola de escritura offline, notificaciones push, y cacheo de cartera, pagos o KPIs del dashboard (dominios de alta sensibilidad a frescura).

## Capabilities

### New Capabilities

- `offline/app-shell`: Manifest, iconos, registro del Service Worker, instalación de la PWA y actualización controlada del shell (sin cachear respuestas de red/API).
- `offline/query-persistence`: Mecanismo de persistencia y rehidratación del cache de TanStack Query hacia IndexedDB para las queries de inventario habilitadas.
- `offline/data-policy`: Lista explícita de qué dominios de datos pueden cachearse en el cliente (lotes/mapas sí; cartera/pagos/dashboard no) y la justificación de negocio.
- `offline/freshness`: Umbrales fresco/desactualizado/muy desactualizado y la regla de que un estado cacheado nunca se presenta como garantía vigente.
- `offline/tenant-isolation`: Invariante de que ninguna query multi-empresa se persiste si su query key no incluye `empresaId`, más la purga de cache en logout y cambio de empresa.
- `offline/write-protection`: Reglas para deshabilitar y comunicar operaciones comerciales/financieras mientras no hay red, con Supabase como única fuente de verdad para confirmarlas.
- `offline/ux`: Indicadores visibles de conectividad/antigüedad del dato y prompts de actualización del Service Worker.

### Modified Capabilities

- (ninguna — `openspec/specs/` todavía está vacío porque `lotes-al-mando-prototype` no ha sido sincronizado/archivado; el cambio de shape en las query keys de inventario se documenta como impacto de código, no como spec modificada)

## Impact

- **Código**: hooks de inventario en `src/presentation/hooks/` (cambio de query keys), nuevo módulo de infraestructura offline (persister, utilidades de frescura, hook de conectividad), `AuthProvider.logout` (purga de cache), `vite.config.ts` (`vite-plugin-pwa`), `index.html` (manifest, `theme-color`), `public/` (manifest, iconos de instalación).
- **Dependencias**: agregar `vite-plugin-pwa`, `@tanstack/react-query-persist-client` (o `@tanstack/query-persist-client-core`) y un storage adapter para IndexedDB (ej. `idb-keyval`).
- **Secuencia**: la propuesta y el diseño quedan fijados ahora; la implementación (tasks.md) queda condicionada a que `lotes-al-mando-prototype` alcance una base de código estable primero.
- **Seguridad**: la purga de cache en logout/cambio de empresa es un requisito duro — RLS protege Supabase, pero no protege lo que ya quedó escrito en IndexedDB del dispositivo.
