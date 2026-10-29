# Proposal

## Why

La vista satelital actual se compone de teselas de Esri World Imagery y se escala para cubrir el visor; cuando no existe cobertura en el nivel pedido, se recorta y amplía una tesela ancestro, lo que puede hacer más visible la pixelación. Antes de publicar cambios conviene medir qué parte de la pérdida de nitidez procede de ese muestreo y qué parte es el límite real de las imágenes disponibles, manteniendo la precisión geográfica y la interacción de los lotes.

## What Changes

- Auditar la ruta de renderizado de las vistas Satélite, 3D del plano y Cesium, incluyendo sus tamaños, zoom solicitado y efectivo, cobertura máxima, escalado CSS, `devicePixelRatio`, overlays y costes de peticiones.
- Definir y aplicar una estrategia de resolución que use únicamente teselas disponibles de Esri, reduzca ampliaciones evitables y mantenga transiciones y consumo de recursos razonables en pantallas estándar e HiDPI.
- Validar que la georreferenciación, los polígonos y las herramientas existentes sigan alineados y utilizables con 230 lotes, sin cambiar coordenadas, geometrías, detección, dibujo ni edición.
- Comparar capturas antes y después con centro, zoom, dimensiones y densidad de píxeles equivalentes; documentar resultados y límites de cobertura del proveedor.
- No migrar a Google Maps ni añadir un modo híbrido nuevo: la implementación actual usa Esri World Imagery; Google vía Cesium ion se utiliza para geocodificación, no como proveedor de imágenes.

## Capabilities

### New Capabilities

- `mapa/capa-satelital`: calidad, resolución efectiva, comportamiento HiDPI, alineación geográfica y rendimiento de las capas satelitales existentes.

### Modified Capabilities

Ninguna. El repositorio no tiene actualmente una especificación principal para la capa satelital.

## Impact

- Componentes candidatos: `src/presentation/components/maps/CapaSatelite.tsx`, `georef.ts`, `tilesEsri.ts`, `VisorMapaModos.tsx`, `Visor3D.tsx` y `cesium/VisorCesium.tsx`.
- Las vistas administrativa y pública comparten el selector de modos; la validación debe cubrir ambas rutas sin cambiar sus permisos o flujos.
- El proveedor de imagen continúa siendo Esri World Imagery. Cesium ion y su geocoder Google no se sustituyen ni se convierten en fuente de imágenes.
- No se requieren cambios en dependencias, modelo de datos, RPC, Supabase ni geometrías.
- La disponibilidad real de detalle depende de la cobertura y resolución publicada por Esri para cada ubicación; no se promete detalle adicional cuando la fuente no lo ofrece.
