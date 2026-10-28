## 1. Infraestructura y build (etapa 1, sin superficie visible)

- [x] 1.1 Instalar `cesium` y `vite-plugin-static-copy` como dependencias nuevas, dejando constancia de que es la primera excepción a "sin dependencias nuevas" en `src/presentation/components/maps/`. (`package.json` no admite comentarios: la constancia queda en `vite.config.ts`, junto al bloque que las consume, siguiendo la convención con la que ya se documenta ffmpeg.)
- [x] 1.2 Configurar `vite-plugin-static-copy` en `vite.config.ts` para copiar `node_modules/cesium/Build/Cesium/{Assets,Widgets,Workers,ThirdParty}` a `public/cesium/` en build y en dev.
- [x] 1.3 Definir `CESIUM_BASE_URL = "/cesium/"` en `define` de `vite.config.ts`.
- [x] 1.4 Añadir `optimizeDeps.include: ["cesium"]` (inverso del `exclude` que ya usa el repo para ffmpeg); si el pre-bundle de workers falla en Vite 8, aplicar el respaldo `optimizeDeps.exclude: ["cesium"]` + `worker.format: "es"`.
- [x] 1.5 Excluir assets y chunk de Cesium del precache añadiendo `workbox.globIgnores`, respetando el `maximumFileSizeToCacheInBytes: 3 * 1024 * 1024` ya configurado.
- [x] 1.6 Documentar `VITE_CESIUM_TOKEN` en `.env.example`, con su origen (Cesium ion) y la advertencia de licencia no comercial.
- [x] 1.7 Verificar que `npm run dev` y `npm run build` arrancan sin errores y que el precache generado queda por debajo de su límite de 3 MB.

## 2. Proyección geográfica y detección de disponibilidad

- [x] 2.1 Crear `src/presentation/components/maps/cesium/proyectar.ts` exponiendo `poligonoAWgs84(poligono, limites)`, reutilizando `LimitesGeo` y `limitesDelPlano()` de `georef.ts` como única fuente de verdad de la relación imagen↔mundo.
- [x] 2.2 Cubrir `poligonoAWgs84` con un script bajo `scripts/` (patrón ya usado para las fórmulas de negocio) que verifique el redondeo de coordenadas y el caso de la ventana de lote volviendo a `[0..1]`. (`node scripts/verificar-proyeccion-lotes.ts`, 18 verificaciones.)
- [x] 2.3 Crear `src/presentation/components/maps/cesium/disponibilidad.ts` con la comprobación de `VITE_CESIUM_TOKEN`, WebGL2 (o WebGL1 + `ANGLE_instanced_arrays`) y estado online, cacheando el resultado por sesión. (El estado online entra inyectado —así lo pide D10, que lo toma de `useOnlineStatus()`— para que el núcleo siga siendo puro; la medición del navegador sí se cachea por sesión.)
- [x] 2.4 Verificar que el módulo de disponibilidad no rompe el tipado estricto (`erasableSyntaxOnly`, `noUnusedLocals`, `verbatimModuleSyntax`) y que es testeable sin renderizar. (`node scripts/verificar-disponibilidad-cesium.ts`, 19 verificaciones corriendo en Node sin `document`.)

## 3. Motor 3D y ciclo de vida del Viewer

- [ ] 3.1 Crear `src/presentation/components/maps/cesium/VisorCesium.tsx` como componente diferido que monta el `Viewer` dentro de un `useRef` desde un `useEffect`, importando el CSS de widgets dentro del propio chunk y asignando `globalThis.CESIUM_BASE_URL = "/cesium/"` **antes** de crear el Viewer (obligatorio en dev: ver `design.md` D3, corrección 2).
- [ ] 3.2 Implementar el cleanup idéntico (`viewer.destroy()` + vaciado del contenedor) con un guard que detecte el doble montaje de `<StrictMode>` de `src/main.tsx`, sin acumular Viewers ni contextos WebGL.
- [ ] 3.3 Configurar la escena: `enableLighting`, sombras, atmósfera, HDR y FXAA, sin tocar el `creditContainer`.
- [ ] 3.4 Añadir la capa base por defecto `Terrain.fromWorldTerrain()` + `createOsmBuildingsAsync()` (decisión D2).
- [ ] 3.5 Añadir `createGooglePhotorealistic3DTileset()` como capa conmutable, cargada solo bajo demanda y con `Ion.defaultAccessToken` desde `VITE_CESIUM_TOKEN`.
- [ ] 3.6 Implementar el respaldo automático de la capa fotográfica a terreno + edificios ante error de red, cuota agotada o zona sin cobertura, mostrando el motivo.
- [ ] 3.7 Implementar el vuelo inicial con `BoundingSphere.fromPoints` sobre todas las entidades y pitch −35°.

## 4. Escena de lotes: polígonos, etiquetas e interacción

- [ ] 4.1 Crear `cesium/lotes.ts` que convierta `Lote.poligono` en una entidad `PolygonGraphics` coloreada por `estado` con `HeightReference.CLAMP_TO_GROUND`.
- [ ] 4.2 Mantener un `Map<id_lote, Entity>` y el diff por `id_lote` (mutar existente, crear el nuevo, `removeId()` el de baja) sin ningún `removeAll()`.
- [ ] 4.3 Añadir etiqueta de número de lote con `disableDepthTestDistance = Infinity` para que no la tape ningún edificio.
- [ ] 4.4 Implementar la selección con `viewer.scene.pick()` llamando al contrato existente `onLoteClick(lote)` de `VisorMapaModos.tsx`, abriendo la misma ficha y dejando operativos **Anterior**/**Siguiente**.
- [ ] 4.5 Implementar el vuelo a un lote al seleccionarlo desde la lista o la ficha, sin recrear la escena.

## 5. Controles de escena y actualización de datos

- [ ] 5.1 Añadir el slider de hora del día gobernando `viewer.clock`, con efecto real sobre el sombreado de terreno y edificios e indicación explícita de la limitación sobre la malla fotogramétrica.
- [ ] 5.2 Crear el panel de calidad con sliders de `tileset.maximumScreenSpaceError` (rango 4–32, default 16), `viewer.resolutionScale` (0,5–1,5), FXAA y HDR, mutando la escena existente.
- [ ] 5.3 Crear el proveedor de escena con `subscribe(cb)` / `dispose()` cuyo productor sea intercambiable (`setInterval` hoy, Supabase Realtime o WebSocket mañana), sin inventar endpoints.
- [ ] 5.4 Implementar el refresco que muta entidades por `id_lote` conservando cámara y estado, sin programar ningún refresco cuando `useOnlineStatus()` indique desconexión.

## 6. Integración en los dos mapas y degradación

- [ ] 6.1 Añadir `"cesium"` al tipo `ModoMapa` de `VisorMapaModos.tsx` y montar `VisorCesium` con `React.lazy` y un fallback de carga.
- [ ] 6.2 Añadir la opción **Vista 3D real** al `Segmented` del `PanelCapas`, oculta sin token y deshabilitada con motivo explicado sin WebGL u offline.
- [ ] 6.3 Habilitar el modo en `/mapas` (`MapasPage.tsx`) como etapa 2, dejando el rollback como la simple retirada de una entrada del arreglo de opciones.
- [ ] 6.4 En `MapaPublicoPage.tsx`, añadir `useEffect` para plegar el panel de datos en móvil al cambiar de pestaña y registrar el ícono en `MAPA_TAB_ICONS`, garantizando que la escena no se carga automáticamente.
- [ ] 6.5 Habilitar el modo público como etapa 3, con interruptor separado del interno y solo tras resolver el spike de cobertura (tarea 9.1).
- [ ] 6.6 Verificar que los tres modos existentes (`"plano"`, `"satelite"`, `"3d"`) siguen funcionando sin cambios de contrato en ambas páginas.

## 7. Nitidez de la capa satélite (`georef.ts`)

- [ ] 7.1 En `rejillaTiles()` de `georef.ts`, subir el techo `Math.min(18, zoomIdeal)` a `Math.min(20, zoomIdeal)` y el sobremuestreo `deseado = max(256, anchoCaja * 2)` a `anchoCaja * 3`.
- [ ] 7.2 Implementar el fallback por tile: si el nivel pedido devuelve 404 o contenido vacío, reintentar descendiendo hasta encontrar imagen, sin dejar áreas en blanco.
- [ ] 7.3 Comprobar que `CapaSatelite.tsx` y la capa aérea de `Visor3D.tsx` se benefician sin cambios de contrato, ambas siguen usando `LimitesGeo` y el modo Plano no se ve afectado.
- [ ] 7.4 Verificar con plano completo, zoom bajo y cambio de tamaño de ventana que no aparecen baldosas vacías ni regresión de rendimiento perceptible.

## 8. QA de aceptación, atribución y PWA

- [ ] 8.1 Verificar por red del navegador que abrir la aplicación en modo Plano o Satélite no descarga el código ni los assets de Cesium.
- [ ] 8.2 Verificar que la instalación de la PWA genera un precache dentro de su límite y que una recarga sin conexión arranca desde el precache con todos los modos no-3D operativos.
- [ ] 8.3 Verificar la degradación completa — sin `VITE_CESIUM_TOKEN`, en un navegador sin WebGL2 y sin conexión — comprobando en cada caso que el modo se oculta o se deshabilita con motivo y que no hay pantalla en blanco.
- [ ] 8.4 Verificar en desarrollo con `<StrictMode>` que tras montar → desmontar → montar el modo queda un único Viewer y un único contexto WebGL.
- [ ] 8.5 Verificar que los créditos de atribución permanecen visibles en las cuatro combinaciones (2 páginas × 2 capas base) y que la interfaz no permite ocultarlos.
- [ ] 8.6 Ejecutar `npx tsc --noEmit`, `npm run lint` y `npm run build` sin errores.

## 9. Verificación previa a la etapa 3

- [ ] 9.1 Consultar los `centro_lat`/`centro_lng` reales de los proyectos con mapa publicado, contrastarlos con la cobertura de la capa fotográfica y registrar el resultado en `design.md → Open Questions` para confirmar o descartar el default de D2.
- [ ] 9.2 Confirmar con el usuario el resultado del spike antes de habilitar el modo en `/mapa/:slug` (tarea 6.5), documentando la decisión de licencia no comercial y su disparador de revisión.
