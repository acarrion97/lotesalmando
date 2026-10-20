# Proposal: improve-public-lotization-map

## Why

El enlace público `/mapa/:slug` recibe visitantes que llegan sobre todo desde
móvil, y hoy no pueden responder a la pregunta básica del plano: **qué lote está
disponible y dónde está**. El número de cada lote solo aparece en el tooltip al
pasar el cursor —inexistente en táctil—, no existe ningún filtro de disponibilidad
y la leyenda de estados es decorativa. El resultado es un plano donde los lotes
son manchas de color sin identificar.

Todo lo necesario ya está en el código: `PlanoInteractivo.tsx` dibuja los
polígonos, `lote.poligono` trae la geometría normalizada, `resaltados` ya sabe
atenurar lotes y la RPC `mapa_publico` devuelve `estado` y `manzana` por lote.
Falta montar la experiencia encima de lo que existe.

## What Changes

- **Etiquetas de lote en el plano**: se muestra el número de lote (por ejemplo
  `H1`, que ya identifica la manzana por su prefijo y es único en el proyecto)
  sobre cada polígono cuando su propio texto cabe en él con holgura. Los lotes
  sin espacio no reciben etiqueta, y las etiquetas no interceptan clics ni
  gestos.
- **Filtros públicos por disponibilidad**: la leyenda `LeyendaPlano` deja de ser
  decorativa y pasa a ser el control de filtro (Todos / Disponibles / Reservados /
  Vendidos / …), reutilizando la propiedad `resaltados` sin tocar su contrato.
- **Contadores coherentes**: los conteos de la leyenda y del resumen superior se
  derivan de `mapa.lotes` para contemplar los seis estados comerciales, no solo
  los tres que devuelve el bloque `estadisticas` de la RPC.
- **Navegación de la ficha acotada**: `Anterior`/`Siguiente` recorren únicamente
  los lotes incluidos en el filtro activo, siguiendo el precedente que ya aplica
  el mapa interno.
- **Zoom por gesto de pinza**: pinch-to-zoom con seguimiento de punteros,
  limpieza en `pointercancel`, anclaje del zoom al centro del gesto y supresión
  de clics accidentales al terminar un gesto.
- **Verificación sin dependencias nuevas**: funciones puras (regla de visibilidad
  de etiquetas, derivación de filtros) cubiertas con scripts en `scripts/`, más
  comprobación manual en navegador. No se añaden dependencias.

No hay cambios marcados como **BREAKING**: la RPC, los datos y las rutas se
mantienen.

## Capabilities

### New Capabilities

- `mapa-publico/visualizacion`: experiencia del visitante sobre el plano del
  enlace público — identificación de los lotes por etiqueta, filtrado por estado
  comercial, navegación de la ficha dentro del filtro y zoom por gesto de pinza.

  *Nota:* la ruta no se inventa aquí. `mapa-publico/visualizacion` es la
  capability que ya usan los cambios hermanos `public-map-gallery-financing`
  (pestañas, carrusel, ficha, tooltips) y `aceptar-cotizacion-genera-venta`
  (venta directa); todavía no está sincronizada en `openspec/specs/`. Este cambio
  **añade** requisitos con títulos propios y no altera los ya escritos.

### Modified Capabilities

Ninguna. `openspec/specs/` no contiene todavía requisitos de `mapa-publico` que
se modifiquen.

Hay una interacción que queda documentada en `design.md`: el requisito hermano
*"Ficha del lote al hacer clic en el mapa"* recoge que `Siguiente` muestra "el
lote siguiente del plano". Este cambio añade un requisito propio que acota esa
navegación al filtro activo, y al ser el filtro **Todos** el estado por defecto,
su comportamiento degenera exactamente al escenario hermano. Conviene archivar
`public-map-gallery-financing` antes que este para que ambos requisitos convivan
en la spec principal en ese orden — **y antes de archivarlo revisar sus tareas
pendientes 8.2 (prueba manual del carrusel y la ficha) y 8.3 (modo mock)**, que
siguen abiertas.

## Impact

- **Código afectado** (solo presentación):
  `src/presentation/components/maps/PlanoInteractivo.tsx` y
  `src/presentation/pages/mapa-publico/MapaPublicoPage.tsx`.
- **Sin cambios** en `domain`, `application`, `infrastructure`, en la RPC
  `mapa_publico`, en sus políticas de acceso y en el modelo `lote.poligono`.
- **Sin migraciones** de base de datos y **sin dependencias npm** nuevas.
- **Mapa interno `/mapas`**: sin cambios visibles; las nuevas capacidades
  entran por propiedades con valor por defecto apagado, siguiendo el precedente
  de `mostrarPrecio`.
- **Fuera de alcance**: selección por manzana, redigitalización de geometrías,
  plano vectorial nativo, cambios en reservas, cotizaciones o ventas.
