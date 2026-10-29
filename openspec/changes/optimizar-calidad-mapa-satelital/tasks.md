# Tasks

## 1. Auditoría y línea base

- [ ] 1.1 Auditar las rutas Satélite, 3D del plano y Cesium, registrando tamaño real de contenedor, viewport, nivel solicitado/efectivo, escalado CSS, `devicePixelRatio`, overlays y proveedor; verificar las rutas pública e interna y confirmar que Google vía ion es geocoder, no capa de imagen.
- [ ] 1.2 Capturar línea base visual y de red antes de editar el renderizado para Ciudadela San Lucas con 230 lotes, a 1366 × 768 y 1920 × 1080, DPR 1, 1.5, 2 y 3, zoom cercano/lejano y modos geográficos disponibles; guardar centro, zoom, dimensiones y entorno junto a cada captura para poder repetirla.
- [ ] 1.3 Consultar y documentar la cobertura efectiva y el máximo nivel Esri en las zonas del proyecto de referencia; verificar con pruebas de cobertura que los tiles ausentes degradan sin desalinear los límites ni inventar detalle.

## 2. Ajuste acotado del renderizado

- [ ] 2.1 Ajustar el cálculo del nivel y la rejilla satelital con base en el tamaño físico del viewport y la cobertura comprobada; añadir o ampliar verificaciones deterministas de georreferenciación y fallback, y confirmar que coordenadas y geometrías no cambian.
- [ ] 2.2 Alinear la configuración de resolución y nivel máximo de Cesium con la cobertura y densidad medidas, conservando Esri World Imagery y el geocoder Google vía ion; verificar que la escena degrada correctamente cuando falta imagen, token o conexión.
- [ ] 2.3 Verificar caché, deduplicación, solicitudes y ciclo de redimensionado para la capa compartida; comprobar con contadores que las solicitudes cubren solo los tiles requeridos y que no se genera un incremento injustificado de tráfico o memoria.

## 3. Regresión visual y funcional

- [ ] 3.1 Validar ambas rutas pública e interna en la matriz 1366 × 768 / 1920 × 1080, DPR 1 / 1.5 / 2 / 3, zoom cercano/lejano y modos satélite, 3D del plano y Cesium; guardar capturas con los mismos parámetros de línea base y explicar cualquier diferencia de fecha/cobertura del mosaico.
- [ ] 3.2 Verificar en Ciudadela San Lucas la alineación, legibilidad e interacción de los 230 lotes durante zoom, desplazamiento y cambio de tamaño, y probar detección, dibujo, edición y selección sin cambios de geometría.
- [ ] 3.3 Comparar evidencia antes/después, solicitudes, cobertura efectiva y respuesta de interacción; documentar el diagnóstico, cambios realizados, configuración final, resultados y límites de resolución de Esri, y confirmar `npm run build`, `npm run lint` y `git diff --check`.
