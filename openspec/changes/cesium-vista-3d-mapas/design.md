## Context

El subsistema de mapas ya resuelve georreferenciación a mano y sin dependencias:

```
mapas.centro_lat/lng/ancho_m  ──►  ubicacionDe()        valida rangos
                                   georef.ts            imagen 0..1 → WGS84
                                   CapaSatelite.tsx     tiles Esri, sin key
                                   Visor3D.tsx          CSS3D, 658 líneas

VisorMapaModos.tsx   modo: "plano" | "satelite" | "3d"   ◄── único punto de
                          │                                entrada de AMBAS
   MapasPage (/mapas) ────┤                                páginas
   MapaPublicoPage ───────┘
```

Tres hechos que condicionan el diseño (ver `proposal.md` para el porqué):

1. **No hay `Proyecto.lat/lng`.** Las coordenadas viven en `mapas` y son **un
   punto por proyecto**. Los lotes no tienen coordenadas: tienen `poligono` en
   espacio normalizado de imagen. La proyección lote→WGS84 es un mapeo lineal
   sobre la ventana que ya calcula `limitesDelPlano()`.
2. **PWA con precache de 3 MB** (`workbox.maximumFileSizeToCacheInBytes`) y
   bundle principal de ~2,1 MB. `cesium` pesa ~80 MB descomprimido.
3. **Vite 8**, no Vite 2-5. `vite-plugin-cesium@1.2.23` declara peer
   `vite >=2.7.1` pero nació para generaciones anteriores.

## Goals / Non-Goals

**Goals:**

- Cuarto modo `"cesium"` en `VisorMapaModos`, operativo en `/mapas` y
  `/mapa/:slug` desde el primer día, sin tocar los tres modos existentes.
- Polígonos de lotes proyectados a WGS84 y clamped al terreno, reutilizando
  `lote.poligono` y `georef.ts` — **cero migraciones**.
- Un único secreto: `VITE_CESIUM_TOKEN` (Cesium ion). Sin Google Cloud.
- Carga diferida total: ni el chunk de Cesium ni sus assets entran al bundle
  inicial ni al precache.
- Degradación explícita y probada ante falta de token, WebGL o conexión.

**Non-Goals:**

- ~~Sustituir `Visor3D` (modo `"3d"`): convive.~~ **Revocado en
  implementación: ver D13.** El selector queda en `Plano` / `Satélite` / un
  único `Vista 3D` apuntando a `cesium`, y `Visor3D` deja de ser alcanzable
  desde la UI. Se conservan el componente y la rama `"3d"` por si toca
  restaurarlo.
- Un `api.ts` con `fetch` suelto: fuera de estilo. El punto de integración de
  datos entra por la cadena repository → use-case → hook.
- Mediciones sobre la malla, vuelos programados, multi-idioma de la UI.
- Resolver la licencia comercial de ion (decisión de negocio, ver riesgos).
- Soportar navegadores sin WebGL2 con un render 3D alternativo.

## Decisions

### D1. Motor: Cesium ion vía `VITE_CESIUM_TOKEN`, sin key de Google

**Decisión:** un solo token ion. `Ion.defaultAccessToken` desde env. La capa
fotográfica se pide con `createGooglePhotorealistic3DTileset()` (va por ion), y
la base es `Terrain.fromWorldTerrain()` + `createOsmBuildingsAsync()`.

**Por qué:** el usuario descartó Google Cloud por el momento. ion sirve los
mismos fototiles bajo su propio acuerdo, y además **los dos assets de fallback
son de ion** — así que el token era obligatorio igualmente. Una sola variable
simplifica `.env.example`, el mock y el error message.

La capa fotográfica requiere el geocoder de Google. Se habilita el geocoder
integrado de Cesium con `IonGeocodeProviderType.GOOGLE`, autenticado por el
mismo `VITE_CESIUM_TOKEN`; no se configura una clave directa de Google Maps ni
un proyecto de Google Cloud. `onlyUsingWithGoogleGeocoder: true` documenta esa
configuración al crear el tileset y evita la advertencia de Cesium.

**Alternativas descartadas:**

- _Google Maps API key directa_: exige billing, tarjeta y `Map Tiles API`.
  Queda como ampliación futura si la cuota ion no alcanza — entonces se añade
  `VITE_GOOGLE_MAPS_KEY` y la capa fotográfica la sirve Google directo.
- _Tiles abiertos sin token_ (OSM raster, MapTiler): no dan terreno 3D ni
  edificios; rehacen lo que `CapaSatelite` ya hace en 2D.

**Consecuencia de diseño importante:** terreno + OSM Buildings **sí** responde
al `enableLighting` y al slider de hora; la malla fotogramétrica trae
iluminación horneada en la textura. Por eso la base por defecto es
**terreno + edificios** y la fotográfica es conmutable (D2).

### D2. Capa base por defecto = terreno + edificios; fotográfica como opción

**Decisión:** al entrar en el modo se monta `World Terrain + OSM Buildings`.
La capa fotográfica es un toggle. El respaldo automático (fuera de cobertura,
cuota agotada, error de red) es a terreno + edificios, nunca a un estado roto.

**Por qué (tres razones, en orden de peso):**

1. **Cobertura.** Photorealistic cubre ~2.500 ciudades en núcleos urbanos. Un
   loteo nuevo típicamente está en el extranjero de la ciudad → malla plana.
   OSM Buildings es global desde OpenStreetMap y el relieve existe en todo el
   territorio. Para _este_ producto, terreno+edificios casi seguro llega más lejos.
2. **El slider de hora del día** (requisito del usuario) solo es visible en
   serio sobre esta base.
3. **Cuota ion Community = 1.000 root tiles/mes.** Poner la capa cara como
   base la agota con el mapa público anónimo en días.

**Alternativa descartada:** _photográfica por defecto con fallback_ — invierte
el costo y deja el requisito de iluminación sin efecto en la experiencia típica.

**Pendiente (spike, no bloquea specs):** verificar los `centro_lat/lng` reales
contra cobertura fotográfica. Si todos caen dentro, se puede reconsiderar el
default — pero la estructura de código no cambia.

**Corrección de la etapa 3 (pregunta que D1/D2 no cubrían):**

`World Terrain` **no trae imágenes**: es solo elevación. Deba del terreno y
de OSM Buildings hace falta una capa de fotos, o se ven edificios negros
sobre un globo sin textura. Tres decisiones derivadas, todas verificadas
contra Cesium 1.146:

1. **La capa de imágenes es Esri World Imagery**, la misma que ya alimentan
   `CapaSatelite` (modo Satélite) y la capa aérea de `Visor3D`. No es una
   decisión de estética: la plantilla se extrajo a `PLANTILLA_TILE_ESRI` en
   `georef.ts` y `urlTile()` ahora se construye con ella, así las tres capas
   leen **una sola constante** y no pueden desincronizarse. Descarta la
   alternativa implícita (`ImageryLayer.fromWorldImagery()`, el default de
   Cesium), que va por ion y **consumiría cuota** de un mapa anónimo sin que
   nadie lo pidiera — el default de D2 está pensado justo para evitar eso.
2. **En la capa fotográfica se oculta el globo** (`scene.globe.show = false`)
   en lugar de cambiar el proveedor de terreno. La malla fotogramétrica trae
   su propio relieve en la geometría; apilar `World Terrain` debajo de ella
   pone dos superficies en la misma posición y sale z-fighting. Ocultar el
   globo es lo que recomienda Cesium y evita además una recarga de terreno
   por cada conmutación. Se restaura al volver a terreno y en el cleanup.
   *Coste asumido:* donde la malla no llega se ve el cielo, no Esri. Se asume
   porque D2 ya hace de la cobertura el eje de esta decisión y el respaldo
   automático (3.6) cubre el caso de error.
3. **`enableLighting` gobierna el slider de hora** sobre terreno *y* sobre
   OSM Buildings; la malla fotogramétrica tiene iluminación grabada en la
   textura y no le afecta. Eso ya estaba en D1 y ahora tiene su reflejo en
   el texto de ayuda de la escena, que cambia según la capa activa.

`creditContainer` **no se pasa**: la atribución de Esri entra por la opción
`credit` del proveedor y queda en el contenedor por defecto de Cesium (D9).

### D3. Aislamiento del paquete: `React.lazy` + `vite-plugin-static-copy`, no `vite-plugin-cesium`

**Decisión:**

- Ruta de componente con `React.lazy(() => import("./cesium/VisorCesium"))`,
  con nombre de chunk fijo (`assets/VisorCesium.js`) para poder excluirlo del
  precache sin adivinar el hash.
- Copia de `node_modules/@cesium/engine/Build/{Assets,Workers,ThirdParty}` a
  `dist/cesium/` con `vite-plugin-static-copy`, y
  `define: { CESIUM_BASE_URL: '"/cesium/"' }`.
- `optimizeDeps.include: ["cesium"]` (pre-bundle) — inverso del
  `optimizeDeps.exclude` que ya usa el repo para ffmpeg.
- El geocoder del Viewer usa `IonGeocodeProviderType.GOOGLE`, requisito de
  Google Photorealistic 3D Tiles; el geocoder y el tileset usan el token ion,
  sin una clave directa de Google Maps.
- `workbox.globIgnores: ["cesium/**", "**/VisorCesium*.js"]` para que ni el
  chunk ni los assets entren al precache.
- CSS de widgets importado **dentro** del componente diferido, desde
  `@cesium/widgets` (no hay que copiar `Widgets/`: sus imágenes son data-URI).
- El loader diferido asigna `globalThis.CESIUM_BASE_URL` **antes** de crear el
  Viewer. Ver "Corrección de la etapa 1" más abajo: `define` no basta.

**Corrección de la etapa 1 (hallazgos verificados, no supuestos):**

1. **Cesium 1.146 está modularizado.** `cesium` es un envoltorio que re-exporta
   `@cesium/engine`, `@cesium/widgets`, `@cesium/core` y `protobufjs`. Los
   assets y workers que el runtime pide por URL viven en `@cesium/engine/Build`
   (2,4 MB de workers, 1,3 MB de thirdparty, 4,2 MB de assets), **no** en la
   carpeta histórica `cesium/Build/Cesium`, cuyo contenido es distinto. Los
   workers reciben la base URL por mensaje (`self.CESIUM_BASE_URL =
data.baseUrl`), así que propagan la corrección automáticamente.
2. **`define` alcanza en build pero no en dev.** Verificado sobre el bundle
   generado y sobre `node_modules/.vite/deps/cesium.js`: en `vite build`
   `typeof CESIUM_BASE_URL` queda plegado a `"/cesium/"`, pero el pre-bundle de
   deps conserva el `typeof` crudo, y Cesium caería a `import.meta.url` →
   `/node_modules/.vite/deps/Assets/` → 404. El global en runtime cubre dev sin
   deshacer el `define` de build.

**Por qué:** el peer range de `vite-plugin-cesium` es `>=2.7.1` pero su era es
Vite 2-5; el repo está en Vite 8 con pipeline rolldown/oxc. Es una dependencia
de un solo mantenedor para un trabajo de ~15 líneas que `vite-plugin-static-copy`
hace y que ya es estable en v4. Prefiero la pieza pequeña y explícita.

**Riesgo asumido:** si en Vite 8 el pre-bundle de Cesium rompe workers, el
respaldo es `optimizeDeps.exclude: ["cesium"]` + `worker.format: "es"`.

**Alternativa descartada:** _carga estática en `main.tsx`_ — mete ~2 MB al
bundle principal, rompe el precache y arruina el arranque offline ya casi
terminado (`pwa-offline-support` 43/44).

### D4. Ciclo de vida del Viewer contra React 19 + StrictMode

**Decisión:** el componente monta el `Viewer` en un `useRef` dentro de
`useEffect`, con destrucción explícita (`viewer.destroy()` + vaciado del contenedor)
en el cleanup, y un guard que detecta el doble invocación de StrictMode.
El div contenedor siempre se recrea limpio.

**Por qué:** `main.tsx` usa `<StrictMode>`, que en desarrollo monta→desmonta→
monta. Sin cleanup idéntico se acumulan dos Viewers y dos contextos WebGL, que
es el bug clásico de Cesium+React (contextos agotados, canvas huérfano).

**Regla:** el Viewer se crea **una sola vez por sesión de modo activo**; ningún
cambio de datos, de hora ni de calidad lo recrea. Los cambios de datos mutan
entidades (D5), los de calidad mutan propiedades de escena.

### D5. Datos: entidad por lote con identidad estable, actualización in-place

**Decisión:** un `Map<id_lote, Entity>`. El primer montaje crea las entidades;
los refrescos hacen diff por `id_lote`: posición/estado → mutar la existente;
alta → crear; baja → `entities.removeId()`. Nunca `removeAll()`.

**Por qué:** es lo que exige el requisito "sin recrear la escena". Además
habilita el refresco por intervalo **y** un canal en vivo futuro sin cambiar
el contrato — si algún día hay WebSocket, cambia el _productor_ de eventos, no
el consumidor.

**Sobre el WebSocket:** no hay endpoint hoy y no lo invento. El diseño expone
`subscribe(cb)` / `dispose()` de modo que el productor sea intercambiable
(`setInterval` → Supabase Realtime → WS) sin tocar Cesium. Punto de
integración marcado en código.

**Polígonos vs marcadores:** lo que el usuario llamó "marcadores" se resuelve
como **polígonos de lote** (D-context: no existen puntos por proyecto con
altura). Cada `lote.poligono` (par `[x,y]` normalizado) → WGS84 con la ventana
de `limitesDelPlano()`, que es exactamente el mapeo inverso al que ya usa
`CapaSatelite` para posicionar tiles. `HeightReference.CLAMP_TO_GROUND` para
que abrace el relieve. Etiqueta con `disableDepthTestDistance = Infinity` para
que no la tape ningún edificio. Clustering **queda fuera**: son pocos lotes por
proyecto y `EntityCluster` solo aplica a billboards/points, no a polígonos.

**Nota de precisión:** el mapeo asume la imagen del plano alineada al norte
(hipótesis que `limitesDelPlano()` ya hace y que `CapaSatelite` comparte). Si
el plano del cliente está girado, los polígonos quedan rotados — mismo
comportamiento que hoy en modo satélite, no es una regresión.

### D6. Catálogo de proyección en un solo módulo, no disperso

**Decisión:** `src/presentation/components/maps/cesium/proyectar.ts` expone
`poligonoAWgs84(poligono, limites)`, reutilizando `LimitesGeo` y
`limitesDelPlano()` de `georef.ts`.

**Por qué:** `georef.ts` es la única fuente de verdad de la relación imagen↔mundo.
Si algún día cambia (rotación del plano, escala no uniforme), cambia en un sitio
y ambas capas (satélite y Cesium) se corrigen juntas.

### D7. Nitidez de la capa satélite: subir el techo y el sobremuestreo

**Decisión:** en `rejillaTiles()`:

- `Math.min(18, zoomIdeal)` → `Math.min(20, zoomIdeal)` con **fallback por
  tile**: si el proveedor devuelve 404/vacío en el nivel pedido, se reintenta
  descendiendo hasta encontrar imagen, sin dejar huecos.
- `deseado = anchoCaja * 2` → `anchoCaja * 3`.
- El zoom solicitado se redondea hacia arriba para alcanzar el sobremuestreo
  objetivo cuando el límite lo permite. Por decisión confirmada por el usuario,
  el techo 20 prevalece si una caja mayor requeriría zoom 21: en ese caso se
  usa el mejor nivel permitido, aunque el muestreo efectivo sea menor que 3×.
- La disponibilidad se comprueba con el endpoint `tilemap` de Esri antes de
  mostrar una tesela: el servicio puede responder HTTP 200 con una imagen de
  aviso cuando no hay datos para ese nivel. En `CapaSatelite` cada tile baja al
  primer ancestro publicado; el visor Cesium limita el `maximumLevel` al nivel
  que cubre por completo la ventana del proyecto.

**Por qué:** el cálculo actual pide el zoom correcto y luego lo corta. Para un
plano de 240 m en 600 px el nivel pedido es ~20,5 y se queda en 18 → 0,597 m/px
cuando hacen falta ~0,10 m/px: **6× de déficit**, el causante directo de que
"no se vea nítida". Subir el techo es la palanca de mayor efecto; el
sobremuestreo 2×→3× ataca el muestreo bajo `rotateX(58°)`.

**Alternativa descartada:** _dejar la nitidez solo a Cesium_ — deja el modo
Satélite y la capa aérea de `Visor3D` igual de blandas, y son los modos que
funcionan offline sin token. Hay que mejorar los dos.

**Fallback obligatorio:** el clamp nuevo es inofensivo si Esri no llega a 20
en la zona — baja solo. Un `onError` no alcanza: Esri puede entregar HTTP 200
con una imagen de texto ("Map data not yet available"). La capa consulta
disponibilidad vía `tilemap` y baja al ancestro con datos; Cesium limita el
nivel máximo de su base a la cobertura completa del proyecto. Si no hay datos
para ningún nivel, se conserva terreno y lotes sin la capa satelital.

**Corrección de la etapa 7.4 (el fallback solo no bastaba):**

La verificación sobre la ubicación real mostró que el descenso *funciona* pero
se paga caro. En Machala Esri publica imágenes hasta **z18**; a z19 y z20
devuelve tiles de aviso con HTTP 200. Con el techo 20, `rejillaTiles` pedía
**154 tiles sin datos** para una caja de 600 px, y cada uno hacía dos consultas
`tilemap` extra antes de bajar a z18: la ventana terminaba mostrando
exactamente la misma imagen que antes de subir el techo, con ~3× más
peticiones. Es decir, el fallback descubría el problema tarde y por tile, en
lugar de saberlo una sola vez y de antemano.

Dos cambios:

1. **`rejillaTiles()` gana un parámetro opcional `zoomMaximo = 20`.** El
   tercer argumento es el techo absoluto, por encima incluso del de
   resolución, y es `undefined`/20 para los llamantes actuales: nadie cambia
   de comportamiento sin querer.
2. **`CapaSatelite` pide el techo de cobertura antes de montar la rejilla**,
   con `nivelMaximoEsriConCobertura` — la misma función y el mismo patrón que
   `VisorCesium` ya usaba para su `maximumLevel`. La capa raster y la base
   3D dejan de decidir por separado hasta qué nivel vale la pena pedir. Mientras
   no se sabe el techo no se pide nada, así no se tiran tiles de un nivel que
   puede fallar; si la consulta de cobertura falla se usa 17 como techo
   conservador y el descenso por tile sigue siendo la red de seguridad.

Resultado medido por `scripts/verificar-cobertura-satelite.ts`: **16 tiles por
ventana y 0 sin datos** (antes 154 y 154), sin un solo descenso; en el barrido
de anchos de 320 a 1600 px el coste baja de **546 a 80 tiles**. El techo de
cobertura manda sobre el de resolución, así que el muestreo efectivo queda en
5,59× a 600 px y 1,05× a 1600 px: a esa anchura ya se pide la máxima nitidez
que el proveedor tiene, no una que no exista.

### D8. Nitidez de Cesium: `maximumScreenSpaceError` como control de usuario

**Decisión:** slider de `tileset.maximumScreenSpaceError` (default 16, rango
4–32) + `viewer.resolutionScale` (0,5–1,5) + FXAA + HDR, todo en un panel de
calidad. El rango 4–32 se acota para que "más nítido" no dispare la cuota ion
sin control — con 4 se pide ~8× más tiles que con 32.

**Por qué:** es la palanca de nitidez en WebGL (mipmaps + filtrado anisotrópico
en shader, elección de tiles por frame) y a la vez es el mando de consumo de
ancho de banda y de cuota.

### D9. Atribución: no se toca el `creditContainer`

**Decisión:** no se pasa `creditContainer` oculto ni se aplana con CSS. Se
verifica en QA que los créditos se ven en las cuatro combinaciones (2 bases ×
2 páginas).

**Por qué:** es ToS de Google para la capa fotográfica y atribución de datos
para OSM/terrain. Regla de aceptación, no cosmética.

### D10. Degradación: capability detectada una vez, cacheada

**Decisión:** comprobación en el punto de carga del modo — `VITE_CESIUM_TOKEN`
presente, WebGL2 o WebGL1+`ANGLE_instanced_arrays`, y `useOnlineStatus()` (ya
existente). Si falla, el modo no se ofrece (falta de token) o se ofrece
deshabilitado con motivo (WebGL/conexión). Nunca pantalla en blanco.

**Por qué:** el enlace público es mobile-first; hay equipos reales sin WebGL2
y Cesium 1.146 exige WebGL2 (o extensión) para billboards y labels. Sin esto,
usuario ve canvas negro.

**Sobre offline:** Cesium no puede funcionar offline (los tiles son remotos y
los assets quedan fuera del precache por D3). El contrato es: _la app arranca
offline y los modos Plano/Satélite funcionan; el modo 3D real avisa_. Esto es
consistente con `pwa-offline-support`.

### D11. Punto de integración de datos en la forma de la casa

**Decisión:** si el usuario pide el catálogo de puntos como servicio, entra así:

```
domain/mapa/entities/…            entidad + validación (zod, como ubicacionDe)
application/mapa/use-cases/…      orquestación
infrastructure/repositories/       Supabase*  +  Mock*   ← VITE_DATA_PROVIDER
presentation/hooks/…               useQuery → isLoading / isError / data
presentation/validations/…         schema zod
```

**Por qué:** no existe `api.ts` en el repo; los únicos `fetch` son dos
funciones serverless. Un `api.ts` con `fetch` a mano rompe el patrón, el lint y
la capacidad de mockear con `VITE_DATA_PROVIDER=mock`. El requisito de usuario
("tipado, validez, errores, estado de carga") se cumple con la cadena existente.

**Nota:** con D5 el catálogo de referencia sale de `useMapaByProyecto` /
`useMapaPublico`, que ya traen `centro_lat/lng/ancho_m` y `lote.poligono`. El
repositorio nuevo solo hace falta si aparece una fuente de puntos distinta.

### D12. Datos del mapa disponibles offline durante una hora

**Decisión:** separar la persistencia de datos de mapa de la persistencia general
de inventario. El mapa público se identifica por slug; el mapa interno se
identifica por `empresaId` y proyecto. Ambos se conservan en IndexedDB durante
un máximo de **1 hora**, y una recarga offline muestra la última lectura
correcta si falla el refresco. La caché general de inventario conserva su
política existente de 24 horas.

Para reabrir `/mapas` offline se conserva además, por el mismo plazo, solo el
contexto mínimo de identidad y empresa junto con el permiso `ver_mapas`. No se
persisten credenciales, tokens ni permisos de otros módulos. La caché interna
se purga al cerrar sesión o cambiar de empresa; la caché del mapa público se
purga en los mismos eventos para mantener una sola frontera de limpieza.
También se conserva la selección del último proyecto, etapa y manzana, vinculada
al usuario y empresa, para que la recarga de `/mapas` restaure el mapa que ya se
había abierto; esa selección expira y se purga con el resto de datos internos.
Los lotes usados por la página interna se guardan bajo una clave específica del
mapa, no bajo la retención general de inventario de 24 horas.

**Por qué:** el shell de la PWA ya arranca desde el service worker, pero
`mapa_publico` es una RPC POST y no se recupera del precache de assets. Sin
persistir su resultado, una recarga offline reemplaza el mapa por una pantalla
de error. La persistencia existente ya permite datos de mapas interactivos,
pero su allowlist y sus claves actuales no incluyen esos resultados.

**Alternativas descartadas:**

- _Guardar todas las respuestas del backend_: mezcla dominios con requisitos
  de frescura distintos y podría conservar datos financieros.
- _Persistir todos los permisos del usuario_: ampliaría el acceso offline más
  allá de lectura de mapas. La caché offline conserva únicamente `ver_mapas`.
- _Subir a una hora el límite global de precache de consultas_: afectaría la
  política de 24 horas de inventario ya desplegada; por eso los mapas usan una
  clave de persistencia separada.

### D13. `Visor3D` sale del selector (revocación del Non-Goal)

**Decisión:** se revoca el Non-Goal «Sustituir `Visor3D` (modo `"3d"`):
convive». El arreglo `OPCIONES` de `VisorMapaModos.tsx` pasa de cuatro
entradas —`Plano`, `Satélite`, `Vista 3D` (`"3d"`) y `Vista 3D real`
(`"cesium"`) — a tres, con un único `Vista 3D` apuntando a `cesium`:
`Visor3D` deja de ser alcanzable desde la UI de `/mapas` y `/mapa/:slug`.

**Por qué:** con Cesium ofreciendo el lugar real, «Vista 3D» y «Vista 3D
real» eran dos etiquetas indistinguibles en el mismo selector, y la segunda
solo se entendía junto a la primera. Mantener las dos obligaba a explicar la
diferencia en la propia etiqueta.

**Qué se conserva — el rollback sigue costando una línea:**

- `ModoMapa` sigue siendo `"plano" | "satelite" | "3d" | "cesium"` y
  `Visor3D.tsx` sigue importado, montándose en la rama
  `modoActivo === "3d"` y con su contrato de props intacto (tarea 6.6). No se
  borra nada: restaurar el modo es volver a añadir la entrada a `OPCIONES`.
- `Visor3D` sigue siendo una de las dos rasters que se benefician de la mejora
  de nitidez de D7 (tarea 7.3); sacarlo del selector no toca su código.

**Consecuencia asumida y explícita:** la degradación D10 deshabilita `cesium`
con `sin-webgl` y `sin-conexion`, así que **sin conexión ya no queda ninguna
vista 3D** — solo Plano, porque Satélite también pide tiles a Esri. Es el
coste de la revocación. Si llega a pesar, la vía no es restaurar la entrada
sino diferenciar las etiquetas de los dos visores, que es lo que en su momento
motivó el cambio.

## Risks / Trade-offs

- **[Cuota ion agotada por mapa público anónimo]** → 1.000 root tiles/mes ≈ 33
  sesiones/día contra tráfico compartible. _Mitigación:_ la escena no se carga
  hasta acción explícita del visitante (spec), base por defecto = terreno+edificios
  (D2), capa fotográfica conmutable, `maximumScreenSpaceError` acotado (D8),
  métrica de uso antes de producción.

- **[Licencia ion no comercial aplicada a un SaaS]** → el plan Community cubre
  uso personal/no comercial; `/mapa/:slug` es material comercial. _Mitigación:_
  decisión tomada y registrada con disparador de revisión (cualquier
  monetización del enlace o superación sostenida de cuota). No se esconde en el
  design: está en `proposal.md → Impact`.

- **[Vite 8 vs `vite-plugin-cesium`]** → peer range engañoso, era Vite 2-5.
  _Mitigación:_ D3 usa `static-copy` + `define` (piezas estables). Respaldo:
  `optimizeDeps.exclude` + `worker.format: "es"`.

- **[Peso rompe el precache de 3 MB]** → `pwa-offline-support` queda a 43/44 y
  se perdería arranque offline. _Mitigación:_ D3 — `globIgnores` explícitos y
  QA con "recarga sin conexión" como escenario de aceptación.

- **[Cobertura fotográfica ausente en los loteos]** → la escena se vería plana
  con la capa cara. _Mitigación:_ D2 la hace conmutable y con respaldo
  automático; **spike** previo con coordenadas reales para decidir el default.

- **[React StrictMode duplica el Viewer]** → dos contextos WebGL, canvas
  huérfano. _Mitigación:_ D4, cleanup idéntico + guard; verificado en dev.

- **[Proyección de polígonos asume plano alineado al norte]** → si el plano
  está girado, los polígonos quedan rotados. _Mitigación:_ es la misma
  hipótesis que ya hace `CapaSatelite` hoy — comportamiento no nuevo. Se
  documenta en `UbicacionMapaForm` como límite conocido de la georreferenciación.

- **[Controles de calidad mal usados amplían el consumo]** → "más nítido" =
  más tiles = más cuota. _Mitigación:_ rango acotado (D8) y aviso junto al
  control.

- **[Modo nuevo sobre specs hermanas sin sincronizar]** →
  `mapa-publico/visualizacion` no está en `openspec/specs/` y hay dos cambios
  tocándola. _Mitigación:_ este cambio **no** modifica esa capability; usa
  capacidades nuevas (`mapa/visualizacion-3d`, `mapa/capa-satelite`) y debe
  archivarse después de `public-map-gallery-financing` e
  `improve-public-lotization-map`.

## Migration Plan

Sin migraciones de base de datos. Despliegue en tres etapas, cada una
reversible:

1. **Etapa 1 — infraestructura sin superficie visible.** Dependencia, copia de
   assets, `define`, `globIgnores`, env. _Rollback:_ revert de `package.json` +
   `vite.config.ts`; ningún usuario lo nota porque no hay UI.
2. **Etapa 2 — modo interno.** `"cesium"` visible solo en `/mapas`. _Rollback:_
   la opción se oculta quitando una entrada del arreglo de opciones de
   `VisorMapaModos`; el código diferido queda inerte sin coste.
3. **Etapa 3 — modo público.** Se habilita en `/mapa/:slug` tras el spike de
   cobertura y con la métrica de cuota visible. _Rollback:_ mismo interruptor,
   por separado para cada página.

Riesgo de producción concentrado en la etapa 1 (build/PWA). Se valida con
`npm run build` + recarga offline **antes** de tocar UI.

**Criterio de listo para producción:** `npm run build` verde, ningún archivo en
el precache por encima del límite por archivo de 3 MB, **cero** assets y cero
chunk de Cesium en el precache, arranque offline correcto, atribución visible
en las 4 combinaciones, y `scripts/` de verificación pasando (el repo ya usa ese
patrón para funciones puras).

**Hallazgo fuera de alcance (registrado, no arreglado aquí):** el precache ya
pesaba 17,4 MB antes de este cambio y sigue pesando lo mismo después. Lo
provocan los PNG de logos sin optimizar de `public/` (`logo.png` 1,8 MB,
`lotes_al_mando_logos/ChatGPT Image…` 1,8 MB, `logo-transparent.png` 1,1 MB…)
junto al chunk principal de 2,4 MB. Este cambio no lo empeora y no lo arregla:
corresponde a un cambio aparte sobre el peso del arranque offline.

## Open Questions

Deferrables sin cambiar specs, enfoque ni desglose de tareas:

- **Productor de refresco en vivo.** `setInterval` basta para la spec; el
  contrato `subscribe/dispose` deja Supabase Realtime o WS abiertos sin
  rediseño.
- **Estrategia de `refetch` para cuota.** Cuánto caduca la sesión de tiles en
  la práctica con nuestro patrón de uso; requiere métricas reales.
- **Ampliación a key de Google directa.** Solo si la cuota ion se queda corta;
  añade `VITE_GOOGLE_MAPS_KEY` sin tocar specs (la capa fotográfica ya es
  conmutable y su _fuente_ es un detalle de implementación).

Sin otras preguntas: todo lo que hubiera cambiado specs, el enfoque o el
desglose de tareas está decidido arriba.

### Resolución: alcance de cobertura fotográfica (spike de la etapa 3)

La pregunta de cobertura —que antes estaba diferida— se resolvió con el spike
`scripts/spike-cobertura-fotogrametrica.ts` (tarea 9.1). Resultado sobre el
único proyecto con mapa publicado y GPS en producción:

- **`ciudadela-san-lucas`** (Ciudadela San Lucas), `-3.31480187245578,
-79.9554215423267`, ancho 500 m. Reverse geocode (Nominatim): Los Ceibales 2,
  Machala, El Oro, Ecuador.
- El sondeo resuelve el asset ion `2275207` (Google Photorealistic 3D Tiles) y
  baja el cuadtreo por _containment_ (boundingVolume.box en ECEF) hasta el tile
  que contiene el punto. **Llega al nivel 20 con malla `.glb` continua** (tiles
  de ~38 m), veredicto **COMPLETA**. La malla existe de forma continua desde el
  nivel 5 hasta el 20 en el camino hacia el punto; no hay huecos.

**Decisión que habilita (task 6.5):** la cobertura fotogramétrica existe y es
de detalle suficiente para los proyectos publicados actuales, así que la capa
fotográfica puede habilitarse en la etapa 3 pública sin riesgo de mostrar un
terreno vacío. **Confirmado por el usuario (task 9.2):** se acepta el uso del
plan _Community_ (no comercial) de Cesium ion para el mapa público, con el
disparador de revisión ya registrado en `Risks / Trade-offs` (cualquier
monetización del enlace o superación sostenida de cuota). Se decidió **dejar la
capa habilitada en ambos mapas** (público e interno) sin interruptor por
entorno: el selector es compartido y la opción ya estaba expuesta; el
_rollback_ de la etapa 3 es retirar la entrada `{ label: "Vista 3D",
value: "cesium", … }` del arreglo `OPCIONES` en `VisorMapaModos.tsx` (ver
6.3), y el reset del modo al salir de la pestaña Mapa (6.4) garantiza que
regarar nunca dispare tiles sin acción del visitante. Condicionantes que se
mantienen:

- **Cuota.** El modo público es anónimo y consume tiles; si la cuota ion se
  acerca al límite, el rollback es el mismo (retirar la entrada) y la vía de
  ampliación está en la pregunta abierta de key de Google propia.
- **Muestra pequeña.** n=1 (un solo mapa publicado). Si se publican más
  proyectos fuera del área urbana de Machala, re-ejecutar el spike antes de
  ampliar la expectativa de cobertura.
