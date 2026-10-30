# Proposal

## Why

La vista satelital actual se compone de teselas de Esri World Imagery y se escala para cubrir el visor; cuando no existe cobertura en el nivel pedido, se recorta y amplía una tesela ancestro, lo que puede hacer más visible la pixelación. Antes de publicar cambios conviene medir qué parte de la pérdida de nitidez procede de ese muestreo y qué parte es el límite real de las imágenes disponibles, manteniendo la precisión geográfica y la interacción de los lotes. Además, la imagen satelital no lleva texto: ni nombres de vía ni títulos de lugar, de modo que quien explora el mapa no puede situarse por nombres. Conviene superponer una capa de etiquetas con la misma atribución del proveedor y sin introducir otro servicio.

## What Changes

- Auditar la ruta de renderizado de las vistas Satélite, 3D del plano y Cesium, incluyendo sus tamaños, zoom solicitado y efectivo, cobertura máxima, escalado CSS, `devicePixelRatio`, overlays y costes de peticiones.
- Definir y aplicar una estrategia de resolución que use únicamente teselas disponibles de Esri, reduzca ampliaciones evitables y mantenga transiciones y consumo de recursos razonables en pantallas estándar e HiDPI.
- Validar que la georreferenciación, los polígonos y las herramientas existentes sigan alineados y utilizables con 230 lotes, sin cambiar coordenadas, geometrías, detección, dibujo ni edición.
- Comparar capturas antes y después con centro, zoom, dimensiones y densidad de píxeles equivalentes; documentar resultados y límites de cobertura del proveedor.
- Superponer una capa de etiquetas con nombres de vía y títulos de lugar sobre la imagen, con su propio interruptor y la atribución del proveedor visible, sin sustituir la imagen base ni alterar la georreferenciación, y dejando constancia de que el detalle de etiquetas depende de lo que el proveedor publique en cada zona y escala.
- No migrar a Google Maps ni añadir un modo híbrido nuevo: la implementación actual usa Esri World Imagery; la imagen base por defecto continúa siendo Esri World Imagery; Google vía Cesium ion se conserva como geocoder y como la capa fotogramétrica opcional ya existente de la vista 3D real, sin convertirse en la imagen base.

## Capabilities

### New Capabilities

- `mapa/capa-satelital`: calidad, resolución efectiva, comportamiento HiDPI, alineación geográfica, etiquetas de vía y de lugar superpuestas y rendimiento de las capas satelitales existentes.

### Modified Capabilities

Ninguna. El repositorio no tiene actualmente una especificación principal para la capa satelital.

## Impact

- Componentes candidatos: `src/presentation/components/maps/CapaSatelite.tsx`, `georef.ts`, `tilesEsri.ts`, `VisorMapaModos.tsx`, `Visor3D.tsx` y `cesium/VisorCesium.tsx`.
- Las vistas administrativa y pública comparten el selector de modos; la validación debe cubrir ambas rutas sin cambiar sus permisos o flujos.
- El proveedor de imagen continúa siendo Esri World Imagery. Cesium ion y su geocoder Google no se sustituyen; la vista 3D real conserva su capa fotogramétrica opcional de Google, que no es la imagen base ni afecta al modo Satélite.
- La capa de etiquetas usa teselas de referencia del mismo proveedor Esri, sin clave ni dependencia nueva; añade solicitudes por tesela visible y no aporta nombres donde el proveedor no publica vías tituladas, como el interior de un desarrollo nuevo.
- No se requieren cambios en dependencias, modelo de datos, RPC, Supabase ni geometrías.
- La disponibilidad real de detalle depende de la cobertura y resolución publicada por Esri para cada ubicación; no se promete detalle adicional cuando la fuente no lo ofrece.
