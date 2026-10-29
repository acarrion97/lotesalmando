# Design

## Context

Ver `proposal.md` para la motivación. La ruta actual usa Esri World Imagery en teselas Web Mercator de 256 px. `CapaSatelite` mide el ancho del contenedor, deriva un nivel objetivo y escala una rejilla de teselas; cuando falta una tesela, puede recortar y ampliar una tesela ancestro. El modo Cesium inicia con Google Photorealistic 3D vía Cesium ion; cuando se elige terreno o la capa fotográfica falla, Esri World Imagery queda como respaldo. Los visores y sus polígonos están compartidos entre las páginas pública y administrativa.

Esri publica además dos servicios de referencia transparentes compatibles con la imagen: `Reference/World_Transportation`, con nombres de vía, y `Reference/World_Boundaries_and_Places`, con límites y títulos de lugar. `World_Street_Map` es opaco y `World_Reference_Overlay` no tiene contenido en la zona de referencia.

La implementación deberá satisfacer `specs/mapa/capa-satelital/spec.md`. Las coordenadas, geometrías, RPC, registros, detección y herramientas de edición están fuera de alcance.

## Goals / Non-Goals

**Goals:**

- Distinguir resolución de origen, resolución solicitada, resolución efectiva del tile y escala final en pantalla antes de ajustar la lógica.
- Usar el nivel de origen disponible más apropiado para el área visible y la densidad física del viewport, con degradación por cobertura sin modificar la ubicación del tile.
- Comparar las rutas raster existentes de Satélite, 3D del plano y Cesium, preservando las capas y controles actuales.
- Mantener la cantidad de solicitudes y el trabajo de renderizado limitados a la cobertura necesaria, midiendo el caso de 230 lotes.
- Superponer etiquetas de vía y de lugar con la misma atribución y documentar su cobertura real por zona y escala. En Google Photorealistic 3D las etiquetas no están garantizadas por el proveedor.

**Non-Goals:**

- Integrar Google Maps Platform 2D o crear una API Google Maps JavaScript.
- Agregar un modo híbrido o filtros de nitidez, super-resolución u otro procesamiento que invente detalle.
- Cambiar la georreferenciación, los polígonos, la detección, el dibujo, la edición, los datos de Supabase o las dependencias.
- Sustituir la imagen base por un mapa de calles, usar un proveedor de etiquetas de pago o con clave, o dibujar nombres propios del proyecto sobre la imagen.

## Decisions

1. **Medir antes de cambiar la estrategia de tiles.** Capturar el estado actual y registrar viewport CSS, tamaño real del contenedor, `devicePixelRatio`, nivel solicitado, nivel efectivo por cobertura, tiles fuente y escalas CSS. Se elige esta alternativa frente a elevar directamente el zoom máximo, porque un zoom pedido no garantiza que Esri tenga cobertura de más detalle y elevarlo a ciegas puede multiplicar solicitudes sin aumentar nitidez.

2. **Resolver el detalle a partir del tamaño físico requerido y la cobertura real.** La selección de nivel considerará el tamaño del contenedor multiplicado por la densidad de pantalla y el máximo de cobertura comprobado para el área, manteniendo el límite del proveedor. El fallback a un tile ancestro seguirá siendo geográficamente exacto; se minimizará la ampliación cuando exista un nivel más detallado disponible. No se cambiará el endpoint ni se asumirá que una API permite solicitar tiles HiDPI si no lo demuestra la fuente.

3. **Usar la malla Google ya integrada en Cesium como vista inicial.** Al abrir la escena, Google Photorealistic 3D vía Cesium ion es la capa activa inicial; no se solicita una nueva clave Google Maps Platform. Esri World Imagery permanece como alternativa de terreno/respaldo de Cesium y como fuente de los otros modos satelitales. Google Photorealistic ofrece geometría e imagen reales, pero no garantiza nombres de calles o lugares.

4. **No tocar el modelo espacial ni las herramientas.** La optimización se limita al muestreo, selección y presentación de imágenes y al ciclo de actualización del contenedor. Los polígonos deben seguir transformándose desde las mismas coordenadas y geometrías; añadir capas o alterar polígonos para compensar errores de imagen no es una opción.

5. **Validar con evidencia visual y de red reproducible.** Se guardarán capturas antes/después con el mismo centro, zoom, dimensiones y DPR; la matriz incluye 1366 × 768 y 1920 × 1080, DPR 1, 1.5, 2 y 3, escalas cercana/lejana y vistas geográficas existentes. Se medirán número de solicitudes de disponibilidad y de imagen, duplicados, interacción y alineación con 230 lotes. La comparación documentará diferencias de fecha/cobertura del mosaico si la fuente no entrega la misma imagen en ambos momentos.

6. **Etiquetar con teselas de referencia del mismo proveedor.** Se usarán `Reference/World_Transportation` para los nombres de vía y `Reference/World_Boundaries_and_Places` para los títulos de lugar: ambos son transparentes, del mismo proveedor que la imagen y no requieren clave, de modo que se reutilizan la atribución, el formato de teselas y la política de uso ya verificados. Se descarta `World_Street_Map` por opaco y `World_Reference_Overlay` por no publicar contenido en la zona de referencia. El sondeo previo sitúa nombres de vía en el entorno urbano de referencia hasta z18 y el título de la ciudad a z12; junto al proyecto los tiles de etiquetas quedan vacíos a partir de z16 porque el proveedor no publica vías nombradas en el interior del desarrollo. Ese límite se documenta en lugar de compensarse con nombres propios.

7. **La capa de etiquetas es conmutable y no interfiere con los lotes.** Se añade una entrada de interruptor al selector de modos compartido, con atribución visible. Las teselas de etiquetas se solicitan solo para la rejilla visible y se pintan bajo los polígonos y los controles, de modo que clic y arrastre siguen llegando al visor. Si la fuente de etiquetas falla, la imagen base continúa funcionando sin degradar la interacción.

## Risks / Trade-offs

- [La cobertura, fecha y resolución varían por ubicación y tesela] → Medir la cobertura efectiva del proyecto de referencia y reportar los límites; no prometer más detalle del publicado.
- [Solicitar teselas más detalladas aumenta tráfico y memoria] → Calcular solo la rejilla visible, comprobar deduplicación/cache y comparar contadores con la línea base antes de aceptar el cambio.
- [El emulador DPR o el dispositivo de QA no coincide con el hardware de producción] → Registrar viewport CSS, DPR efectivo y navegador usados en cada captura y realizar validación manual cuando no se pueda emular fielmente.
- [Una vista compartida afecta tanto al mapa público como al interno] → Ejecutar regresiones en ambas rutas y preservar sus condiciones de autenticación y datos.
- [Las capturas de la fuente pueden variar entre fechas aunque el renderizado no cambie] → Separar cambios del mosaico de cambios geométricos o de muestreo, y no afirmar mejora cuando las imágenes de origen no sean comparables.
- [Las etiquetas añaden solicitudes por tesela visible] → Medir el incremento frente a la línea base, aprovechar la caché del navegador y, si el coste es relevante, omitir la capa de títulos de lugar en las escalas en las que el proveedor devuelve teselas vacías.
- [El proveedor no publica vías nombradas en toda la zona] → Documentar el alcance real de las etiquetas por zona y escala, y no presentar la capa como cobertura completa ni inventar nombres propios.
- [Google Photorealistic puede consumir cuota de Cesium ion cada vez que se abre Cesium y no garantiza etiquetas] → Cargar la malla solo cuando el modo Cesium está montado, conservar el aviso de respaldo por cuota/red/cobertura y mantener Esri como alternativa seleccionable.

## Hallazgos de la auditoría (tarea 1.1)

Medido sobre la ruta pública `/mapa/ciudadela-san-lucas` en desarrollo, con viewport de 1000 × 700 píxeles CSS y `devicePixelRatio` 1.

**Ruta Satélite (`CapaSatelite`).** El contenedor se mide con `ResizeObserver` sobre `clientWidth`. La selección del nivel ahora usa `clientWidth × devicePixelRatio`; la rejilla se pinta a tamaño «mundo» y se escala después con `transform: scale(clientWidth / anchoPx)`, conservando el tamaño CSS y la alineación mientras evita ampliar innecesariamente la fuente en pantallas HiDPI. Los cambios de tamaño de ventana actualizan el DPR.

En la ventana del proyecto de referencia la medida real fue: contenedor 566 × 400 CSS px, rejilla de 452,9 × 320,1 px de mundo, factor de escala 1,2497 y 6 teselas, todas a z18. El barrido de cobertura pidió z20 sin datos, luego z19 sin datos y z18 con datos, con lo que **en esta ventana manda el techo del proveedor, no el cálculo**: ya se pide el nivel más alto que Esri publica en Machala. Con `devicePixelRatio` 2 la misma rejilla ocuparía el doble de píxeles físicos con la misma cantidad de mapa de bits, es decir con más ampliación y menos nitidez; conviene corregir el cálculo aunque en esta ventana concreta el techo siga siendo el límite.

**Ruta 3D real (`VisorCesium`).** Renderiza a resolución nativa con `useBrowserRecommendedResolution: false` y acota `resolutionScale` desde el panel de calidad. En la auditoría inicial usaba Esri como capa de imagen y mantenía Google Photorealistic 3D como una capa opcional; la decisión posterior de esta tarea hace que Google Photorealistic sea la capa inicial. Esri se carga de forma diferida al seleccionar terreno o como respaldo. El geocoder continúa siendo Google vía Cesium ion.

**Matiz sobre Google.** La vista 3D real ya integraba `createGooglePhotorealistic3DTileset` bajo la etiqueta «Vista fotográfica», además del geocoder de Google vía ion. Por decisión del usuario, ahora inicia con esa capa. Google Photorealistic 3D no garantiza nombres de calles y consume cuota del token Cesium ion; no se integra Google Maps Platform 2D.

**Selector de modos y rutas.** `VisorMapaModos` expone tres opciones: Plano, Satélite y Vista 3D (Cesium). `Visor3D` sigue en el código, pero el modo `"3d"` no figura entre las opciones, así que no es alcanzable desde la interfaz. Las páginas pública e interna montan el mismo componente. La ruta interna `/mapas` redirige a `/login` sin sesión, por lo que verificar la capa satélite ahí exige un acceso autenticado de desarrollo.

### Sondeos de cobertura y etiquetas (tareas 1.3–1.4)

`node scripts/verificar-cobertura-satelite.ts` confirmó en la ventana de referencia de 500 m en Machala que Esri World Imagery cubre todos los tiles hasta z18; z19 y z20 no tienen datos y los seis tiles ancestros requeridos sí están en z17. Al aplicar z18 como techo, las ventanas de 320, 480, 600, 1000 y 1600 px no tienen tiles vacíos. El total del barrido pasa de 546 tiles pedidos sin techo a 80 con el techo efectivo.

Se sondearon las capas públicas sin clave `Reference/World_Transportation` y `Reference/World_Boundaries_and_Places`. El tilemap de cada capa puede marcar una tesela como válida aunque su PNG sea transparente, por lo que la verificación también midió opacidad del contenido: sobre Ciudadela San Lucas (z18 x72849/y133486 y z16 x18212/y33371) ambas devolvieron PNG de 872 bytes sin píxeles opacos; en Machala urbana a z12 (x1138/y2085), transporte tuvo 7226 píxeles opacos y límites/lugares 886. Esto confirma nombres de vía y títulos de lugar en la escala urbana y ausencia de etiquetas en la ventana del desarrollo. La capa de etiquetas puede ser transparente sin inventar contenido ni reemplazar la imagen.

### Línea base visual parcial (tarea 1.2)

La ruta pública `/mapa/ciudadela-san-lucas?tab=mapa` mostró los 230 lotes en Satélite a escala inicial (zoom 1). Una medición interactiva dio viewport 1366 × 768, DPR 1, contenedor 662.22 × 467.98 CSS px y seis tiles Esri en z18. Al intentar guardar capturas, el navegador integrado reportó un tamaño configurado distinto del `window.innerWidth` efectivo y guardó imágenes con zonas vacías; esas imágenes se descartaron para no conservar evidencia engañosa. Los parámetros reproducibles y esta limitación constan en `docs/capturas/optimizar-calidad-mapa-satelital/baseline.md`.

El acceso interno fue habilitado manualmente durante QA; `/mapas` mostró el proyecto Ciudadela San Lucas, etapa SL y manzana LADRILLERA H (27 lotes). No se pudo obtener evidencia persistente fiable para la matriz completa, cambiar de forma fiable entre los viewports/DPR solicitados, ni probar el modo `"3d"` del plano que no está expuesto en el selector. La tarea 1.2 permanece incompleta y no se afirma validación para esas combinaciones.

### Resolución HiDPI y regresión geométrica (tarea 2.1)

`CapaSatelite` elige la rejilla según el ancho físico del viewport (`clientWidth × devicePixelRatio`) y compone la misma cobertura geográfica en el ancho CSS medido. `node scripts/verificar-rejilla-tiles.ts` pasó con DPR 1, 1.5, 2 y 3, niveles no decrecientes, techo de cobertura y fallback ancestro; `node scripts/verificar-proyeccion-lotes.ts` pasó con el mismo conjunto de coordenadas y geometrías, incluida la alineación del polígono con la rejilla satelital. ESLint dirigido pasó.

### Resolución y degradación de Cesium (tarea 2.2)

La escena se dibuja a resolución nativa del dispositivo (`useBrowserRecommendedResolution: false`) e inicia con Google Photorealistic 3D vía ion. El Viewer se crea sin capa Esri ni consulta de cobertura Esri; esa consulta y la imagen se hacen solo al elegir «Terreno y edificios» o al degradar por fallo de Google. En terreno, Esri usa el mayor nivel con cobertura total; si falla la consulta, conserva el respaldo z17 y avisa, y si no hay imagen publicada conserva terreno y lotes. La interfaz oculta Cesium sin token y deshabilita el modo sin conexión. Google puede consumir cuota ion y no garantiza etiquetas de calle. Build y prueba de cobertura pasaron antes del cambio de capa inicial; el build actual verifica compilación.

### Caché e incremento de solicitudes (tareas 2.3–2.4)

La comprobación de cobertura sigue compartiendo promesas por bloque y limita su caché a 512 entradas; el script `verificar-cobertura-satelite.ts` mide 546 tiles frente a 80 con el techo aplicado. En la ruta pública, 12 tiles satelitales visibles produjeron 12 imágenes base; activar etiquetas añadió exactamente 12 tiles de `World_Transportation` y 12 de `World_Boundaries_and_Places`, sin URL duplicada. Desactivarlas retiró las 24 imágenes de etiqueta y conservó las 12 imágenes base. Al ampliar el lienzo de 764 a 1146 CSS px, ResizeObserver mantuvo la rejilla z18 de 12 tiles y no hubo consultas tilemap adicionales para la misma rejilla. Con etiquetas activas, un clic en un lote abrió su ficha y un arrastre modificó el scroll del visor (108,93 → 38,48); las capas de etiqueta usan `pointer-events: none`.

El switch se comparte en Satélite, 3D del plano y Cesium. La atribución visible de la vista raster añade HERE, Garmin, OpenStreetMap y la comunidad GIS a la atribución de la imagen; Cesium recibe el crédito correspondiente mediante sus proveedores de imagen. En la zona interior de Ciudadela San Lucas las teselas de etiquetas cargan transparentes, conforme al sondeo de cobertura, sin nombres inventados.

Al probar la ruta administrativa `/mapas` con el switch activado, los 24 tiles visibles de las dos fuentes Esri para Ciudadela San Lucas (z18, cuatro columnas por tres filas) devolvieron PNG de 872 bytes y cero píxeles opacos. Esto explica por qué no aparecen en ese desarrollo nombres como los que Google sí publica en la captura compartida; la capa funciona, pero la fuente elegida no proporciona esos datos en esa ubicación. Se mantiene la decisión de no añadir Google Maps Platform 2D. El switch muestra una ayuda que aclara que la cobertura de etiquetas Esri depende de zona y escala; al usar Google Photorealistic, las etiquetas no están garantizadas.

## Migration Plan

1. Capturar y registrar la línea base en desarrollo para la ubicación de referencia, sus 230 lotes y la matriz acordada.
2. Implementar los ajustes mínimos en la capa satelital compartida y en la inicialización de Cesium que la evidencia requiera.
3. Ejecutar validaciones geométricas, de interacción, red, construcción y comparación visual; conservar evidencia y anotar limitaciones del proveedor.
4. Publicar junto con el cambio habitual de frontend. Si hay regresiones, revertir los ajustes de renderizado de teselas; no se necesita migración de datos ni de servicios.

## Open Questions

- Al ejecutar las pruebas, ¿el slug público `ciudadela-san-lucas` y el acceso autenticado al mapa interno siguen disponibles en el entorno de desarrollo para capturar los mismos 230 lotes? Si no, la etapa de implementación deberá identificar un fixture o acceso de QA autorizado antes de reportar la validación como completa.
