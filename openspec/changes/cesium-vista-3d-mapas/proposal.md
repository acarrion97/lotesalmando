## Why

Hoy la "Vista 3D" del mapa es `Visor3D.tsx`: la imagen del plano inclinada con
`transform` CSS. No hay terreno real, no hay el entorno del proyecto, y la capa
satélite que la respalda se ve blanda (el zoom está cortado en 18, ~0,60 m/px,
cuando un plano de 240 m necesita ~0,20 m/px). Un visitante del enlace público
`/mapa/:slug` no puede juzgar **dónde está** el proyecto ni qué hay alrededor,
que es justo lo que decide una compra.

Los datos para dar ese contexto ya existen y están georreferenciados:
`mapas.centro_lat / centro_lng / ancho_m` + `georef.ts` convierten cada
polígono de lote en coordenadas WGS84. **No hace falta ninguna migración** para
dibujar los lotes sobre el terreno real: solo falta un motor que lo renderice
en 3D de verdad.

## What Changes

- **Nuevo modo "Cesium" en el selector de mapas**, disponible en **los dos
  mapas** desde el primer día: interno `/mapas` y público `/mapa/:slug`. El
  tipo `ModoMapa` pasa de `"plano" | "satelite" | "3d"` a incluir `"cesium"`.
  Ambas páginas ya comparten `VisorMapaModos`, así que la integración es en un
  solo punto. `Visor3D` (modo `"3d"`) **dejó de ofrecerse en el selector**
  durante la implementación (design.md D13): el tipo `ModoMapa` conserva
  `"3d"`, el componente sigue importado y montándose en su rama, pero ya no
  hay entrada en `OPCIONES` que lo seleccione.
- **Lotes como polígonos reales sobre terreno**: cada `lote.poligono` se
  proyecta a WGS84 con la ventana geográfica ya calculada y se dibuja con
  `HeightReference.CLAMP_TO_GROUND`, coloreado por estado, con etiqueta y clic
  que abre la misma ficha de lote que hoy (`onLoteClick` sin cambiar contrato).
- **Escena geográfica con `CESIUM_TOKEN` (Cesium ion) como único token de
  acceso**: Photorealistic 3D Tiles vía ion como capa conmutable, con
  `Terrain.fromWorldTerrain()` + `createOsmBuildingsAsync()` como base
  **sin Google** y como fallback. **Sin API key de Google y sin Google Cloud.**
- **Iluminación y hora del día**: `enableLighting`, sombras, atmósfera y un
  slider de hora que gobierna `viewer.clock`. Sobre la base terrain+buildings
  el slider surte efecto real; sobre photorealistic la malla trae iluminación
  horneada y solo cambian cielo/atmósfera (limitación documentada, no oculta).
- **Cámara inicial**: `viewer.flyTo` sobre `BoundingSphere.fromPoints` de todas
  las entidades con pitch −35°, y vuelo a la ubicación al elegir un marcador
  con panel de datos (patrón de ficha ya existente, no `InfoBox` de Cesium).
- **Actualización sin recrear el Viewer**: refresco por intervalo o WebSocket
  que muta posiciones de entidades existentes por `id`, conservando el Viewer.
- **Ajustes de calidad**: HDR, FXAA, `resolutionScale` y
  `maximumScreenSpaceError` configurables desde UI.
- **Mejora de nitidez de la capa satélite existente** (`Visor3D` +
  `CapaSatelite`): el techo `Math.min(18, …)` de `rejillaTiles()` pasa a
  permitir zoom 19/20 con _fallback_ automático si el proveedor no tiene esa
  resolución, y el sobremuestreo sube de 2× a 3×.
- **Degradación obligatoria**: sin `CESIUM_TOKEN`, sin WebGL2 (o sin
  `ANGLE_instanced_arrays`), o sin conexión → el modo Cesium se oculta o avisa
  y el usuario queda en los modos actuales. La PWA sigue funcionando offline.
- **Atribución visible**: el contenedor de créditos (Google + data providers)
  nunca se oculta; es requisito de ToS, no cosmético.

No hay cambios marcados como **BREAKING**: la RPC `mapa_publico`, el modelo
`lote.poligono`, las rutas y los contratos de `onLoteClick` / `VisorMapaModos`
se mantienen. La extensión de `ModoMapa` es aditiva.

## Capabilities

### New Capabilities

- `mapa/visualizacion-3d`: experiencia del modo Cesium en ambos mapas —
  disponibilidad del modo, proyección y dibujo de polígonos de lotes sobre
  terreno real, selección de capa base, cámara e iluminación, controles de
  calidad, actualización de entidades sin recrear el Viewer, requisitos y
  degradación (token, WebGL, conexión) y atribución obligatoria.
- `mapa/capa-satelite`: nitidez y resolución de la capa satélite georreferenciada
  que respalda el modo satélite y `Visor3D` — selección de zoom según la escala
  real del plano, tolerancia cuando el proveedor no alcanza esa resolución, y
  sobremuestreo mínimo.

### Modified Capabilities

Ninguna. `openspec/specs/` todavía no contiene requisitos de `mapa-publico` ni
de visualización de mapas que se modifiquen. La capability hermana
`mapa-publico/visualizacion` (usada por `public-map-gallery-financing` e
`improve-public-lotization-map`) **no está sincronizada** en `openspec/specs/`;
este cambio no la toca ni añade requisitos a ella — convive en paralelo y debe
archivarse después que esas, según el orden ya anotado en
`improve-public-lotization-map`.

## Impact

- **Dependencia nueva**: `cesium` (~80 MB descomprimido). Es la ruptura más
  grande de la convención "sin dependencias nuevas" del subsistema de mapas
  (`Visor3D`, `georef`, `CapaSatelite` son a mano). Se admite explícitamente y
  se aísla con carga diferida.
- **Build y PWA**: chunk de Cesium debe ir por `React.lazy` fuera del bundle
  principal (~2,1 MB) y excluirse del precache de workbox
  (`maximumFileSizeToCacheInBytes: 3 MB`) con `globIgnores`. Requiere copiar
  `Assets/Widgets/Workers/ThirdParty` a `public/` y `CESIUM_BASE_URL`. Riesgo
  abierto: `vite-plugin-cesium@1.2.23` declara peer `vite >=2.7.1` pero su era
  es Vite 2-5 y el repo está en **Vite 8** — alternativa de respaldo
  `vite-plugin-static-copy` + `define`, con precedente en
  `optimizeDeps.exclude` (ffmpeg).
- **Código afectado**: `src/presentation/components/maps/`
  (`VisorMapaModos.tsx`, `Visor3D.tsx`, `CapaSatelite.tsx`, `georef.ts` y
  módulos nuevos `cesium/`), `src/presentation/pages/mapas/MapasPage.tsx`,
  `src/presentation/pages/mapa-publico/MapaPublicoPage.tsx`,
  `vite.config.ts`, `.env.example`, `package.json`.
- **Datos**: sin migraciones. Se leen `mapas.centro_lat/centro_lng/ancho_m` y
  `lote.poligono`, ya servidos por `useMapaByProyecto` / `useMapaPublico`.
- **Proveedor de datos**: nuevo punto de integración con el patrón de la casa
  (repositorio `supabase` + `mock` vía `VITE_DATA_PROVIDER`, use-case, hook con
  React Query y validación zod), **no** un `api.ts` con `fetch` suelto.
- **Costo y licencia — decisiones registradas**:
  - _Tomada_: photorealistic vía ion, **sin Google Cloud**. Atribución Google
    siempre visible.
  - _Tomada_: licencia **no comercial** (ion Community) por el momento. El
    plan gratis cubre uso personal/no comercial y `mapa/` es material comercial
    de un SaaS. **Disparador de revisión**: cualquier monetización del enlace
    público o superación sostenida de cuota.
  - _Riesgo abierto_: cuota ion Community = **1.000 root tiles/mes** (~33
    sesiones/día) y **15 GB/mes** de streaming, contra `/mapa/:slug` **anónimo
    y compartible**. Cada refresh puede iniciar sesión nueva. El modo Cesium
    público arranca **detrás de una acción explícita del visitante**, no
    automáticamente.
  - _Pendiente (spike)_: verificar los `centro_lat/lng` reales contra la
    cobertura de Photorealistic 3D Tiles. Si los loteos caen fuera, photorealistic
    queda como capa conmutable y **terrain+OSM Buildings pasa a ser la base**.
