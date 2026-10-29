# Design

## Context

Ver `proposal.md` para la motivación. La ruta actual usa Esri World Imagery en teselas Web Mercator de 256 px. `CapaSatelite` mide el ancho del contenedor, deriva un nivel objetivo y escala una rejilla de teselas; cuando falta una tesela, puede recortar y ampliar una tesela ancestro. Cesium consulta cobertura Esri para limitar el nivel máximo de su proveedor de imágenes y usa Google vía Cesium ion únicamente como geocoder. Los visores y sus polígonos están compartidos entre las páginas pública y administrativa.

La implementación deberá satisfacer `specs/mapa/capa-satelital/spec.md`. Las coordenadas, geometrías, RPC, registros, detección y herramientas de edición están fuera de alcance.

## Goals / Non-Goals

**Goals:**

- Distinguir resolución de origen, resolución solicitada, resolución efectiva del tile y escala final en pantalla antes de ajustar la lógica.
- Usar el nivel de origen disponible más apropiado para el área visible y la densidad física del viewport, con degradación por cobertura sin modificar la ubicación del tile.
- Comparar las rutas raster existentes de Satélite, 3D del plano y Cesium, preservando las capas y controles actuales.
- Mantener la cantidad de solicitudes y el trabajo de renderizado limitados a la cobertura necesaria, midiendo el caso de 230 lotes.

**Non-Goals:**

- Migrar la capa de imagen a Google Maps, crear una API Google Maps JavaScript o cambiar de proveedor.
- Agregar un modo híbrido o filtros de nitidez, super-resolución u otro procesamiento que invente detalle.
- Cambiar la georreferenciación, los polígonos, la detección, el dibujo, la edición, los datos de Supabase o las dependencias.

## Decisions

1. **Medir antes de cambiar la estrategia de tiles.** Capturar el estado actual y registrar viewport CSS, tamaño real del contenedor, `devicePixelRatio`, nivel solicitado, nivel efectivo por cobertura, tiles fuente y escalas CSS. Se elige esta alternativa frente a elevar directamente el zoom máximo, porque un zoom pedido no garantiza que Esri tenga cobertura de más detalle y elevarlo a ciegas puede multiplicar solicitudes sin aumentar nitidez.

2. **Resolver el detalle a partir del tamaño físico requerido y la cobertura real.** La selección de nivel considerará el tamaño del contenedor multiplicado por la densidad de pantalla y el máximo de cobertura comprobado para el área, manteniendo el límite del proveedor. El fallback a un tile ancestro seguirá siendo geográficamente exacto; se minimizará la ampliación cuando exista un nivel más detallado disponible. No se cambiará el endpoint ni se asumirá que una API permite solicitar tiles HiDPI si no lo demuestra la fuente.

3. **Mantener una única fuente y las rutas compartidas.** La capa de mapa plano/satélite y las vistas Cesium seguirán usando Esri World Imagery. La geocodificación de Cesium ion se conserva independiente de la imagen base. La alternativa de integrar Google Maps se descarta porque contradice la decisión confirmada de mantener la capa actual y no resuelve los límites de cobertura de Esri por sí misma.

4. **No tocar el modelo espacial ni las herramientas.** La optimización se limita al muestreo, selección y presentación de imágenes y al ciclo de actualización del contenedor. Los polígonos deben seguir transformándose desde las mismas coordenadas y geometrías; añadir capas o alterar polígonos para compensar errores de imagen no es una opción.

5. **Validar con evidencia visual y de red reproducible.** Se guardarán capturas antes/después con el mismo centro, zoom, dimensiones y DPR; la matriz incluye 1366 × 768 y 1920 × 1080, DPR 1, 1.5, 2 y 3, escalas cercana/lejana y vistas geográficas existentes. Se medirán número de solicitudes de disponibilidad y de imagen, duplicados, interacción y alineación con 230 lotes. La comparación documentará diferencias de fecha/cobertura del mosaico si la fuente no entrega la misma imagen en ambos momentos.

## Risks / Trade-offs

- [La cobertura, fecha y resolución varían por ubicación y tesela] → Medir la cobertura efectiva del proyecto de referencia y reportar los límites; no prometer más detalle del publicado.
- [Solicitar teselas más detalladas aumenta tráfico y memoria] → Calcular solo la rejilla visible, comprobar deduplicación/cache y comparar contadores con la línea base antes de aceptar el cambio.
- [El emulador DPR o el dispositivo de QA no coincide con el hardware de producción] → Registrar viewport CSS, DPR efectivo y navegador usados en cada captura y realizar validación manual cuando no se pueda emular fielmente.
- [Una vista compartida afecta tanto al mapa público como al interno] → Ejecutar regresiones en ambas rutas y preservar sus condiciones de autenticación y datos.
- [Las capturas de la fuente pueden variar entre fechas aunque el renderizado no cambie] → Separar cambios del mosaico de cambios geométricos o de muestreo, y no afirmar mejora cuando las imágenes de origen no sean comparables.

## Migration Plan

1. Capturar y registrar la línea base en desarrollo para la ubicación de referencia, sus 230 lotes y la matriz acordada.
2. Implementar los ajustes mínimos en la capa satelital compartida y en la inicialización de Cesium que la evidencia requiera.
3. Ejecutar validaciones geométricas, de interacción, red, construcción y comparación visual; conservar evidencia y anotar limitaciones del proveedor.
4. Publicar junto con el cambio habitual de frontend. Si hay regresiones, revertir los ajustes de renderizado de teselas; no se necesita migración de datos ni de servicios.

## Open Questions

- Al ejecutar las pruebas, ¿el slug público `ciudadela-san-lucas` y el acceso autenticado al mapa interno siguen disponibles en el entorno de desarrollo para capturar los mismos 230 lotes? Si no, la etapa de implementación deberá identificar un fixture o acceso de QA autorizado antes de reportar la validación como completa.
