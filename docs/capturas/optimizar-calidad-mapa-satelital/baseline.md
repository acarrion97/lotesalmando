# Línea base: calidad del mapa satelital

## Entorno medido

- Ruta pública: `http://localhost:5173/mapa/ciudadela-san-lucas?tab=mapa`
- Proyecto: Ciudadela San Lucas, 230 lotes.
- Modo: Satélite (Esri World Imagery), zoom inicial del plano `1`, sin desplazamientos.
- Centro geográfico: latitud `-3.31480187245578`, longitud `-79.9554215423267`.
- Medición interactiva: viewport 1366 × 768 CSS px, DPR 1, contenedor 662.22 × 467.98 CSS px y seis tiles de imagen en z18.
- Navegador integrado de desarrollo con el servidor Vite ya ejecutándose.

## Evidencia y límites

El navegador mostró capturas en línea durante la sesión, pero al persistirlas el viewport real volvió a 732 × 412 aunque Playwright reportaba la dimensión configurada. Las imágenes guardadas con dimensiones superiores contenían el mapa recortado y espacio vacío; se eliminaron y no se presentan como evidencia válida.

La ruta interna pudo abrirse tras iniciar sesión manualmente: Ciudadela San Lucas, etapa SL, manzana LADRILLERA H, con 27 lotes. La tarea de línea base no está completa: falta evidencia persistente y comparable para ambas rutas, 1366 × 768 y 1920 × 1080, DPR 1/1.5/2/3, zoom cercano/lejano y todos los modos requeridos. El modo `"3d"` del plano está en el código pero no aparece en el selector.
