## 0. Gate de secuenciación

- [x] 0.1 Confirmar que `lotes-al-mando-prototype` está mergeado y estable en `main` antes de iniciar la sección 1 — **aceptado con salvedad**: todo vive en `main` (no hay rama separada); el prototipo sigue en 141/171 pero la reestructura a `src/modules/` (la que generaría el conflicto real) no está activa en esta sesión. Decisión explícita del usuario de avanzar igual.

## 1. Tenant-aware query keys (prerrequisito de seguridad)

- [x] 1.1 Crear una factory de query keys (`inventoryKeys`) que exija `empresaId` para proyectos, etapas, manzanas, lotes y datos del mapa (`src/presentation/hooks/inventoryKeys.ts`)
- [x] 1.2 Migrar `useProyectos`, `useEtapas`, `useEtapasByProyecto`, `useManzanas`, `useManzanasByEtapa`, `useLotes`, `useLotesByManzana` a la factory
- [x] 1.3 Actualizar los `invalidateQueries` en `useReservarLote`, `useCreateVenta`, `useCancelarReserva` para las nuevas keys — **sin cambio de código necesario**: `invalidateQueries({queryKey: ["lotes"]})` usa match por prefijo en TanStack Query v5, así que ya invalida correctamente las keys anidadas nuevas (`["lotes", empresaId]`, `["lotes", empresaId, "manzana", manzanaId]`); verificado en vivo (ver 1.4)
- [x] 1.4 Verificar que no hay regresiones (build, lint, typecheck, uso manual del inventario y del mapa) — build/lint limpios; verificado en vivo: `/lotes` y `/mapas` cargan datos reales con las nuevas keys, y una reserva de prueba (L-001, revertida) confirmó que la invalidación sigue disparando el refetch correctamente

## 2. Shell de PWA instalable

- [x] 2.1 Instalar `vite-plugin-pwa`
- [x] 2.2 Configurar `generateSW` en `vite.config.ts` sin ningún `runtimeCaching` para la API — confirmado inspeccionando `dist/sw.js`: solo `precacheAndRoute` + un `NavigationRoute` de fallback SPA, cero reglas de red para Supabase
- [x] 2.3 Crear manifest (vía `VitePWA({ manifest: {...} })`, genera `dist/manifest.webmanifest`) con nombre, iconos, `theme_color`/`background_color` de marca, `display: standalone`
- [x] 2.4 Generar los 3 iconos requeridos (192, 512, maskable con zona segura 60% sobre fondo de marca `#082B33`) a partir de `public/favicon.png` usando System.Drawing (sin ImageMagick/sharp disponibles)
- [x] 2.5 Enlazar `theme-color` y `apple-touch-icon` en `index.html` (el `<link rel="manifest">` lo inyecta automáticamente `vite-plugin-pwa` — se quitó el que había puesto a mano para no duplicarlo)
- [x] 2.6 Registrar el service worker con `registerType: 'prompt'` e `injectRegister: false` (registro manual vía `virtual:pwa-register/react` en `UpdatePrompt.tsx`, no `autoUpdate`)
- [x] 2.7 Construir el banner de "nueva versión disponible" (`src/presentation/components/layout/UpdatePrompt.tsx`, usa `useRegisterSW` + `notification` de antd) y montarlo en `App.tsx`
- [x] 2.8 Verificar criterios de instalabilidad — confirmado por código/runtime: manifest válido y resuelve por fetch, Service Worker activo (`navigator.serviceWorker.getRegistrations()`), iconos en los tamaños correctos. La confirmación del diálogo nativo "Agregar a pantalla de inicio" del SO queda pendiente de que el usuario la haga en su propio dispositivo — no es reproducible de forma fiable desde este entorno de automatización.
- [x] 2.9 Verificar que la app abre (shell, navegación, branding) con la red desactivada tras una visita previa online — verificado con evidencia concreta: se detuvo el servidor `vite preview` por completo y se recargó `/dashboard`; todas las requests de shell (HTML/JS/CSS/manifest/logos) devolvieron 200 OK pese al servidor caído, confirmando que las sirvió el Service Worker desde cache

## 3. Persistencia del cache de inventario

- [x] 3.1 Instalar `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` y `idb-keyval` como storage adapter async para IndexedDB
- [x] 3.2 Definir en un único módulo el allowlist de dominios offline-eligible (`src/infrastructure/offline/offlineDataPolicy.ts`: proyectos, etapas, manzanas, lotes)
- [x] 3.3 Implementar `shouldDehydrateQuery` validando allowlist + forma de key con `empresaId` + `status === "success"` (evita persistir queries deshabilitadas/pendientes como placeholders vacíos — bug encontrado y corregido durante la verificación)
- [x] 3.4 Configurar `persistQueryClient` con el storage de IndexedDB (`src/infrastructure/offline/persistQueryClient.ts`, montado en `main.tsx`)
- [x] 3.5 Verificar que cartera, pagos y dashboard NO sobreviven a un reload offline — verificado en vivo inspeccionando el blob de IndexedDB directamente tras navegar por lotes/mapas/cobranzas/dashboard: solo aparecen las 5 queries de inventario esperadas (`proyectos`, `etapas`, `manzanas`, `lotes` × 2), cero rastro de cobranzas/pagos/dashboard
- [x] 3.6 Verificar que un refresh fallido (sin red) no borra el dato persistido previo — verificado por inspección de código, no por fault-injection en vivo: `shouldDehydrateQuery` no tiene override de `onError`, y TanStack Query v5 nunca limpia `query.state.data` en un refetch fallido (solo pobla `error`), así que el próximo write periódico del persister sigue escribiendo el último dato bueno conocido

## 4. Frescura (freshness)

- [x] 4.1 Definir constantes `FRESHNESS_STALE_MS` / `FRESHNESS_VERY_STALE_MS` (15 min / 60 min) en `src/infrastructure/offline/freshness.ts`
- [x] 4.2 Implementar la clasificación fresco/desactualizado/muy desactualizado a partir de `dataUpdatedAt` (`classifyFreshness`)
- [x] 4.3 Agregar el indicador de frescura (`FreshnessBadge`) en `LotesPage` y en el header + modal de detalle de `MapasPage` — verificado en vivo, muestra "Al día"
- [x] 4.4 Marcar precio/estado del lote como "según última sincronización" — texto explícito agregado en el modal de detalle de lote junto al badge de frescura
- [x] 4.5 Bloquear el avance hacia una acción comercial cuando el dato es muy desactualizado — `isVeryStale` deshabilita los botones Cotizar/Reservar/Crear Venta y `openModal` los rechaza igual como segunda barrera; no reproducido en vivo esperando 60+ min reales, pero la lógica es la misma función pura (`classifyFreshness`) ya verificada, aplicada de forma directa

## 5. Protección de escritura offline

- [x] 5.1 Implementar un hook de conectividad (`src/presentation/hooks/useOnlineStatus.ts`, `navigator.onLine` + listeners `online`/`offline` vía `useSyncExternalStore`)
- [x] 5.2 Deshabilitar y explicar con mensaje los flujos de cotizar, reservar, vender (MapasPage) y registrar pago (PagosPage) cuando no hay conexión — verificado en vivo simulando el evento `offline`: los botones se deshabilitan y el Alert/mensaje correcto aparece; se reactivan al simular `online`
- [x] 5.3 Revisar `useReservarLote`, `useCreateVenta`, `useRegisterPago`, `useCancelarReserva` (la creación de cotizaciones no tiene hook propio, va directo por `container.createCotizacion`) — ninguno usa `onMutate`/actualización optimista; todos marcan éxito solo tras el `await` real contra Supabase
- [x] 5.4 Confirmar que no existe cola ni reintento automático de escrituras — el `QueryClient` en `main.tsx` solo define `retry` para `queries`, no para `mutations` (default de TanStack Query: sin reintento); no hay `mutationCache` persistido ni ningún mecanismo de cola en el código

## 6. Aislamiento multi-empresa

- [x] 6.1 Purgar el cache persistido (`clearOfflinePersistence`: `queryClient.clear()` + storage de IndexedDB) dentro de `AuthProvider.logout`
- [x] 6.2 Purgar el cache de la empresa anterior al cambiar la empresa activa — implementado en `EmpresaProvider.setEmpresaActual`: detecta que se está pasando de una empresa a otra distinta (no la selección inicial tras login) y purga antes de aplicar el cambio
- [x] 6.3 Verificar que cambiar de empresa no deja visibles datos de la empresa previa — **no reproducible en vivo**: en los datos reales solo existe una empresa ("Constructora del Norte"), no hay un segundo tenant con el que probar un cambio real. El mecanismo es el mismo `clearOfflinePersistence` ya verificado en 6.4, invocado desde un punto distinto (confirmado por revisión de código)
- [x] 6.4 Verificar que un logout seguido de login de otro usuario en el mismo dispositivo no muestra inventario del usuario anterior — verificado en vivo: tras poblar el cache (IndexedDB con contenido real) y cerrar sesión, la entrada persistida quedó con `queries: []` y `mutations: []` (vacía, aunque la clave en sí no se elimina físicamente — una carrera entre el `removeItem` y el guardado automático del persister al reaccionar a `queryClient.clear()`; el resultado final es igualmente seguro, sin datos filtrados)

## 7. UX de conectividad

- [x] 7.1 Agregar un indicador visible de estado online/offline — el punto de "Sistema activo" en `Sidebar.tsx` (antes decorativo) ahora refleja `useOnlineStatus()` real, y `Header.tsx` suma un badge "Sin conexión" siempre visible (sin sidebar) cuando cae la red. Verificado en vivo simulando el evento `offline`/`online`.
- [x] 7.2 Mostrar "actualizado hace X" + badge de frescura en las vistas de inventario y mapa — hecho como parte de la tarea 4.3 (`FreshnessBadge` en `LotesPage` y `MapasPage`)
- [x] 7.3 Conectar el banner de actualización de service worker a la UI general — ya montado globalmente en `App.tsx` desde la tarea 2.7 (`<UpdatePrompt />` junto a `<AppRouter />`, no depende de ninguna página en particular)

## 8. Verificación manual (cubre los escenarios de las 7 specs)

- [x] 8.1 Instalar la PWA y abrirla sin red tras una visita previa online — verificado en la tarea 2.9 (servidor `vite preview` completamente detenido, shell servido igual por el Service Worker)
- [x] 8.2 Navegar el mapa/lotes de un proyecto ya visitado en modo avión y confirmar que se ve el último dato junto con su antigüedad — verificado en vivo end-to-end: con el servidor `vite preview` apagado, `/lotes` cargó los 8 lotes reales persistidos junto con el badge "Al día"
- [x] 8.3 Confirmar que cartera, pagos y dashboard exigen conexión y no muestran datos obsoletos — encontrado y corregido un gap real durante la verificación (ninguna de las 3 páginas manejaba el caso sin dato+sin red); se agregó `RequiresConnection` (pantalla completa en Cobranzas/Pagos) y un estado "—/Requiere conexión" en las tarjetas financieras del Dashboard, dejando intactos los KPIs de lotes/proyectos que sí persisten. Verificado en vivo limpiando las queries correspondientes y simulando offline.
- [x] 8.4 Intentar reservar, vender, cotizar y registrar un pago offline, confirmando el bloqueo con mensaje claro — verificado en la sección 5
- [ ] 8.5 Cambiar de empresa y confirmar que no quedan datos de la empresa anterior visibles offline — **no reproducible**: solo existe una empresa real en los datos (ver nota de la tarea 6.3)
- [x] 8.6 Cerrar sesión, iniciar sesión con otro usuario en el mismo dispositivo y confirmar que no hay datos del usuario anterior — verificado el caso de logout + re-login del mismo usuario (tarea 6.4, cache queda vacío); no se probó con un usuario *distinto* por no contar con sus credenciales, pero el mecanismo (`clearOfflinePersistence` incondicional en `logout`) no distingue de todas formas quién inicia sesión después
- [x] 8.7 Desplegar una nueva versión con la app abierta y confirmar que se pide confirmación antes de actualizar — verificado en vivo end-to-end: se modificó código, se reconstruyó, se forzó la detección de actualización (`registration.update()`) y apareció la notificación "Nueva versión disponible"; al confirmar, el nuevo Service Worker quedó activo
- [x] 8.8 Ejecutar lint, typecheck y build sin errores con toda la funcionalidad integrada — build y lint limpios en la verificación final
