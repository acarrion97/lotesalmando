## 0. Gate de secuenciación

- [ ] 0.1 Confirmar que `lotes-al-mando-prototype` está mergeado y estable en `main` antes de iniciar la sección 1 (evita conflicto con sus cambios en curso sobre `AppLayout.tsx` y hooks)

## 1. Tenant-aware query keys (prerrequisito de seguridad)

- [ ] 1.1 Crear una factory de query keys (`inventoryKeys`) que exija `empresaId` para proyectos, etapas, manzanas, lotes y datos del mapa
- [ ] 1.2 Migrar `useProyectos`, `useEtapas`, `useEtapasByProyecto`, `useManzanas`, `useManzanasByEtapa`, `useLotes`, `useLotesByManzana` a la factory
- [ ] 1.3 Actualizar los `invalidateQueries` en `useReservarLote`, `useCreateVenta`, `useCancelarReserva` para las nuevas keys
- [ ] 1.4 Verificar que no hay regresiones (build, lint, typecheck, uso manual del inventario y del mapa)

## 2. Shell de PWA instalable

- [ ] 2.1 Instalar `vite-plugin-pwa`
- [ ] 2.2 Configurar `generateSW` en `vite.config.ts` sin ningún `runtimeCaching` para la API
- [ ] 2.3 Crear `manifest.json` en `public/` (nombre, iconos, `theme-color`, `display: standalone`)
- [ ] 2.4 Generar/confirmar los iconos requeridos por el manifest (192, 512, maskable) a partir de los assets ya existentes en `public/`
- [ ] 2.5 Enlazar el manifest y `theme-color` en `index.html`
- [ ] 2.6 Registrar el service worker con `registerType: 'prompt'` (no `autoUpdate`)
- [ ] 2.7 Construir el banner/notification de "nueva versión disponible" usando `needRefresh` / `updateServiceWorker` de `virtual:pwa-register`
- [ ] 2.8 Verificar instalación en Chrome/Edge desktop y Android ("Agregar a pantalla de inicio")
- [ ] 2.9 Verificar que la app abre (shell, navegación, branding) con la red desactivada tras una visita previa online

## 3. Persistencia del cache de inventario

- [ ] 3.1 Instalar `@tanstack/react-query-persist-client` y un storage adapter async para IndexedDB
- [ ] 3.2 Definir en un único módulo el allowlist de dominios offline-eligible (proyectos, etapas, manzanas, lotes, mapa) según `offline/data-policy`
- [ ] 3.3 Implementar `shouldDehydrateQuery` validando allowlist + que la key tenga la forma de la factory de la sección 1 (con `empresaId`)
- [ ] 3.4 Configurar `persistQueryClient` con el storage de IndexedDB
- [ ] 3.5 Verificar que cartera, pagos y dashboard NO sobreviven a un reload offline
- [ ] 3.6 Verificar que un refresh fallido (sin red) no borra el dato persistido previo

## 4. Frescura (freshness)

- [ ] 4.1 Definir constantes `FRESH_MS` / `STALE_MS` (15 min / 60 min) en un módulo central de configuración
- [ ] 4.2 Implementar la clasificación fresco/desactualizado/muy desactualizado a partir de `dataUpdatedAt`
- [ ] 4.3 Agregar el indicador de frescura en el mapa de lotes y en los listados de inventario
- [ ] 4.4 Marcar precio/estado del lote como "según última sincronización" cuando el dato proviene de cache offline
- [ ] 4.5 Bloquear el avance hacia una acción comercial cuando el dato relevante es muy desactualizado, exigiendo reconexión y refresh antes de continuar

## 5. Protección de escritura offline

- [ ] 5.1 Implementar un hook de conectividad (`navigator.onLine` + listeners `online`/`offline`)
- [ ] 5.2 Deshabilitar y explicar con mensaje los flujos de cotizar, reservar, vender y registrar pago cuando no hay conexión
- [ ] 5.3 Revisar `useReservarLote`, `useCreateVenta`, `useRegisterPago`, `useCotizaciones` para confirmar que ninguna mutación se trata como exitosa sin confirmación real del backend
- [ ] 5.4 Confirmar que no existe cola ni reintento automático de escrituras al recuperar conexión

## 6. Aislamiento multi-empresa

- [ ] 6.1 Purgar el cache persistido (`queryClient.clear()` + storage de IndexedDB) dentro de `AuthProvider.logout`
- [ ] 6.2 Purgar el cache de la empresa anterior al cambiar la empresa activa (`useEmpresa` / `EmpresaProvider`) antes de poblar datos de la nueva
- [ ] 6.3 Verificar que cambiar de empresa no deja visibles datos de la empresa previa
- [ ] 6.4 Verificar que un logout seguido de login de otro usuario en el mismo dispositivo no muestra inventario del usuario anterior

## 7. UX de conectividad

- [ ] 7.1 Agregar un indicador visible de estado online/offline en el layout (Header o AppLayout)
- [ ] 7.2 Mostrar "actualizado hace X" + badge de frescura en las vistas de inventario y mapa
- [ ] 7.3 Conectar el banner de actualización de service worker (tarea 2.7) a la UI general de la aplicación

## 8. Verificación manual (cubre los escenarios de las 7 specs)

- [ ] 8.1 Instalar la PWA y abrirla sin red tras una visita previa online
- [ ] 8.2 Navegar el mapa/lotes de un proyecto ya visitado en modo avión y confirmar que se ve el último dato junto con su antigüedad
- [ ] 8.3 Confirmar que cartera, pagos y dashboard exigen conexión y no muestran datos obsoletos
- [ ] 8.4 Intentar reservar, vender, cotizar y registrar un pago offline, confirmando el bloqueo con mensaje claro
- [ ] 8.5 Cambiar de empresa y confirmar que no quedan datos de la empresa anterior visibles offline
- [ ] 8.6 Cerrar sesión, iniciar sesión con otro usuario en el mismo dispositivo y confirmar que no hay datos del usuario anterior
- [ ] 8.7 Desplegar una nueva versión con la app abierta y confirmar que se pide confirmación antes de actualizar
- [ ] 8.8 Ejecutar lint, typecheck y build sin errores con toda la funcionalidad integrada
