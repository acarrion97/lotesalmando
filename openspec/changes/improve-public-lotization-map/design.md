# Design

## Context

Ver `proposal.md` para el motivo. Aquí solo el estado actual que condiciona la
aproximación:

- **Visor**: `src/presentation/components/maps/PlanoInteractivo.tsx` compone un
  `<img>` con el plano raster y, encima, un `<svg viewBox="0 0 natural.w natural.h">`
  con un `<polygon>` por lote. Las coordenadas de `lote.poligono` están
  normalizadas a `[0,1]` y se proyectan multiplicando por las dimensiones
  naturales de la imagen (`aPuntos`, `:221`).
- **Zoom y desplazamiento**: no hay `transform`. El zoom es el ancho del
  contenedor (`anchoBase * zoom`) y el desplazamiento es **scroll nativo** del
  contenedor con `overflow: auto`. `pxPorUnidad` (`:128`) es los píxeles de
  pantalla por unidad de usuario del SVG — la magnitud que hay que usar para
  dibujar cualquier cosa de tamaño constante en pantalla.
- **`resaltados`** (`:57`): `ReadonlySet<number> | null`. Los no incluidos se
  pintan con `opacity: 0.35` y los `disponible` incluidos ganan contorno de
  color (`:361`). Hoy solo lo usa el mapa interno para la selección de manzana
  (`src/presentation/pages/mapas/MapasPage.tsx:275`).
- **Contrato de datos**: la RPC `mapa_publico` (migración `015` sobre `011`,
  `SECURITY DEFINER`, ejecutable por `anon`) devuelve por lote `id_lote`,
  `id_manzana`, `numero_lote`, `estado`, `manzana`, `precio_lista`,
  `superficie_m2`, `medidas` y `poligono`. **No** devuelve `codigo_catastral`.
  El bloque `estadisticas` solo agrega tres estados.
- **Estados**: `LoteEstado` tiene seis valores
  (`disponible`, `reservado`, `vendido`, `en_negociacion`, `bloqueado`,
  `no_disponible`).
- **Pruebas**: no hay runner (`package.json` solo define `dev`, `build`, `lint`,
  `format`, `preview`). Existe el precedente de verificación con
  `scripts/verificar-*.ts` ejecutados con `node`.
- **Seguridad**: RLS está deshabilitado por la migración de emergencia `008` y
  hay un ticket pendiente con soporte de Supabase anotado en el cambio
  `lotes-al-mando-prototype`. Toda lectura anónima pasa por la única RPC.
- **Cambios hermanos abiertos**: `public-map-gallery-financing` y
  `aceptar-cotizacion-genera-venta` ya escriben deltas en
  `specs/mapa-publico/visualizacion/spec.md` y `.../venta-directa/spec.md`.

## Goals / Non-Goals

**Goals:**

- Identificar cada lote sin depender del tooltip, que en táctil no existe.
- Filtrar por disponibilidad con la misma información que ya viaja en la RPC.
- Mantener el mapa interno `/mapas` sin cambios visibles.
- Mantener la RPC, sus privilegios y el modelo `lote.poligono` intactos.
- Cada mejora se puede revertir por separado y ninguna toca datos.

**Non-Goals:**

- Seleccionar lotes por manzana (la opción queda documentada como posible
  evolución; no entra aquí).
- Plano vectorial nativo, redigitalización de geometrías o nuevas columnas.
- Ampliar el contrato de la RPC o tocar RLS / privilegios / `SECURITY DEFINER`.
- Instalar dependencias, incluidas de desarrollo.

## Decisions

### 1. Identificador público: el número de lote (`H1`)

*Corregido durante la implementación con los datos reales del mapa publicado
`ciudadela-san-lucas`: 227 lotes en 11 manzanas.*

La primera versión de este diseño proponía `A-3`, compuesto de manzana y número.
Los datos no encajan con ese supuesto:

```
manzana      = "LADRILLERA H"     (12-13 caracteres, siempre un nombre largo)
numero_lote  = "H1", "H10", "L1.10" (2-5 caracteres)
```

Componer ambos daría `LADRILLERA H-H1`: 14 caracteres, redundante porque la `H`
ya está en `H1`, e imposible de pintar sobre un lote de 26 px de ancho.

Alternativas valoradas:

| Opción | Por qué no |
|---|---|
| `codigo_catastral` | No lo devuelve la RPC; añadirlo ampliaría el contrato público sin necesidad. |
| `manzana`-`numero_lote` (`A-3`) | Con los nombres reales de manzana produce etiquetas de 14 caracteres que no caben. **Descartado por datos.** |
| Letra derivada del nombre del manzana | Requiere inferencia y se rompe si otra urbanización numera distinto. |
| **Solo `numero_lote`** | **Elegido**: ya lleva el prefijo de manzana, es único en todo el proyecto (verificado: 0 duplicados entre 227 lotes) y mide 2-5 caracteres. |

El campo se toma de `PlanoLote`, sin derivarlo jamás del índice del array, que
se reordena al filtrar.

### 2. Tamaño de la etiqueta: compensar con `pxPorUnidad`

Con un `fontSize` fijo en unidades de usuario, el texto se vería minúsculo o
gigante según la resolución de la imagen base, porque el `viewBox` mide en
píxeles naturales. La alternativa (superponer etiquetas en HTML y reposicionarlas
al hacer scroll/zoom) obligaría a suscribir el scroll del contenedor para
recalcular posiciones en cada frame.

Se dibuja `<text>` dentro del SVG con `fontSize` dividido por `pxPorUnidad` — el
mismo patrón que ya usa el modo dibujo para los vértices (`r={6 / pxPorUnidad}`,
`:414`). Para que la etiqueta no intercepte eventos se le aplica
`pointerEvents: "none"`, como al overlay de dibujo (`:399`), y un halo blanco
tras el texto para que se lea sobre los rellenos oscuros de los estados.

### 3. Visibilidad: el texto debe caber en su propio polígono

Un umbral único de zoom es incorrecto: dentro de un mismo plano hay lotes de
superficies distintas, así que a la misma escala unos admiten texto y otros no.

Tampoco bastaba con un umbral fijo de píxeles. Medido sobre el plano real sin
zoom y con el visor a pantalla completa, el lote mediano mide **unos 26 × 18
px**, así que un umbral fijo de 44 × 26 px dejaba **2 etiquetas de 227**: la
regla era técnicamente correcta y prácticamente inútil.

Regla final: la etiqueta se pinta si **su propio texto cabe dentro de su propio
polígono proyectado**. El ancho del texto se estima por número de caracteres, y
esa estimación se contrastó con `getComputedTextLength()` sobre las etiquetas ya
pintadas en el plano real: la mediana medida fue de 6,7-7,4 px por letra, con un
máximo de 8,0, y la desviación respecto a la estimación usada no superó 0,4 px.
Medido sobre ese plano sin zoom:

| Regla | Lotes etiquetados (de 227) |
|---|---|
| Umbral fijo 44 × 26 px | 2 |
| **El texto cabe, fuente 11 px (regla final)** | **195** |

Se usa fuente de 11 px porque es el tamaño más grande con el que casi todo el
plano queda etiquetado sin zoom, y el resto aparece al acercar. El recuento
depende del tamaño de la ventana, ya que la regla es por lote y no global: es
comportamiento esperado, no una excepción. El cálculo es `min`/`max` sobre los
puntos ya cargados, sin dependencias ni llamadas nuevas.

### 4. El filtro vive en la leyenda, no en un componente nuevo

Alternativas valoradas:

- **Componente `LotFilters` aparte** (como sugería el boceto original): añade
  una pieza de UI nueva y una segunda fuente de verdad para los conteos, porque
  `LeyendaPlano` ya muestra exactamente esos números.
- **Hacer clicables los ítems de `LeyendaPlano`** (elegida): la leyenda pasa a
  ser el control, con su contador integrado, y desaparece el problema de
  mantener dos listados coherentes.

Como `LeyendaPlano` se comparte con `/mapas` (`MapasPage:703`), la
interactividad entra por propiedades nuevas **con valor por defecto que la dejan
tal cual está** — el mismo precedente que ya sigue `mostrarPrecio`. La página
pública calcula `resaltados` a partir del estado del filtro y se lo pasa al
visor; el contrato de `resaltados` no cambia.

### 5. Contadores desde `mapa.lotes`, no desde `estadisticas`

`estadisticas` solo agrega `disponibles`/`reservados`/`vendidos`
(migración `011`), igual que el `contarEstados` de respaldo
(`MapaPublicoPage:353`). Con seis estados, `total` puede ser mayor que la suma de
los tres contadores visibles, y una opción de filtro quedaría sin número o con
uno falso. Los conteos se recalculan en cliente sobre `mapa.lotes`, ya cargado;
la RPC no se toca.

### 6. Navegación de la ficha acotada al filtro

El mapa interno ya hace esto: `MapasPage:393` filtra por `resaltados` antes de
buscar el índice para `prev`/`next`. La página pública, en cambio, recorre todos
los dibujados (`MapaPublicoPage:86-92`). Se alinea la pública con el precedente
interno.

**Compatibilidad con el requisito hermano:** `public-map-gallery-financing`
especifica que `Siguiente` muestra "el lote siguiente del plano". Como **Todos**
es el filtro por defecto, nuestro requisito degenera exactamente a ese escenario
cuando no hay filtro activo: los dos conviven sin contradicción. Por eso en
`specs/` solo se usan operaciones `ADDED` con títulos propios y no `MODIFIED`
— modificando un requisito que todavía no está en `openspec/specs/` rompería la
validación. Orden recomendado al archivar: primero `public-map-gallery-financing`.

### 7. La ficha se cierra si el lote sale del filtro

Alternativas: mantener la ficha abierta apuntando a un lote atenuado, o moverla
al primer lote del filtro. Se elige cerrarla: es la única opción que no deja la
interfaz mostrando algo que el propio filtro dice que no se está viendo, y no
inventa una selección que el visitante no pidió.

### 8. Gestos táctiles: mapa de punteros sobre el scroll existente

El desplazamiento táctil ya funciona (scroll nativo con
`touchAction: "pan-x pan-y"`, `:315`); lo que falta es el pinch. Tres puntos
decisivos:

1. **`pointerdown` ignora los punteros que no son de ratón** (`:163`), así que el
   pinch exige llevar un mapa de punteros por `pointerId` y añadir el manejo de
   `pointercancel`, que hoy no existe (solo hay `pointerUp`/`pointerLeave`).
2. **El zoom debe anclarse al centro del gesto.** `cambiarZoom` (`:140-154`) deriva
   el punto a conservar del centro del contenedor (`scrollLeft + clientWidth/2`)
   y lo reaplica en `useLayoutEffect` (`:130-138`). Con dos dedos hace falta un
   centro explícito opcional; sin él el plano se desliza al pellizcar, que es
   exactamente el "salto" que el requisito prohíbe. Se amplía `cambiarZoom` con
   ese parámetro opcional, sin cambiar su comportamiento actual cuando no se pasa.
3. **`touch-action` decide quién captura el pinch.** Con `auto` (zoom 1) el
   navegador se lo lleva y amplía la **página**, no el plano. La alternativa
   `zoom > 1 ? "pan-x pan-y" : "pan-y"` dejaría un dedo para desplazar la página
   y dos dedos para el plano, pero **el comportamiento real depende del motor y
   del dispositivo**: se decide con un spike en hardware, no en papel. Por eso
   esta fase queda marcada con prerrequisito de dispositivo en `tasks.md`.

Además, `ignorarClic` (`:95`) debe activarse al terminar un gesto de dos dedos
para que no se dispare la ficha del lote que quedó debajo.

### 9. Verificación sin runner de pruebas

Con la opción elegida, la regla de visibilidad y la derivación de filtros se
escriben como **funciones puras** y se comprueban con un script en `scripts/`
siguiendo `scripts/verificar-plan-cuotas.ts` (`node scripts/verificar-*.ts`).
El resto se cubre con verificación manual en navegador, definida como checklist
en `tasks.md` para que el criterio de cierre sea comprobable y no se reduzca a
"compila".

**Aviso explícito:** el proyecto no tiene runner de pruebas. Los scripts de
`scripts/` son verificaciones de funciones puras y las tareas de navegador son
comprobaciones manuales; **ninguna de las dos es una suite automatizada de
integración**, y los resultados no deben presentarse como tal al cerrar el
cambio. Si en el futuro se instala un runner, será una decisión aparte, con
dependencias de desarrollo y autorización explícita.

## Risks / Trade-offs

- **La leyenda compartida rompe el mapa interno** → propiedades nuevas con valor
  por defecto apagado; checklist de regresión sobre `/mapas` en cada fase.
- **Etiquetas ruidosas en planos densos** → visibilidad por polígono y no por
  zoom global; si aun así satura, se sube el umbral sin tocar el requisito.
- **Los contadores en cliente difieren de `estadisticas`** → se acepta: la RPC
  sigue siendo la fuente de los lotes, y la discrepancia de tres estados ya
  existe hoy. Cualificador de todo: `mapa.lotes` es el mismo conjunto.
- **`touch-action` atrapa el scroll de la página sobre el plano** → decisión
  pospuesta al spike en dispositivo real; fase de gestos separada y revertible.
- **Conflicto de deltas con `public-map-gallery-financing`** → solo operaciones
  `ADDED` con títulos propios; archivar ese cambio antes que este. Revisión hecha
  el 20/10/2026: sus tareas `8.2` (prueba manual del carrusel y la ficha) y `8.3`
  (modo mock) siguen abiertas. `8.2` ya no está bloqueada por falta de navegador
  —la anotación de la tarea está desactualizada—, pero la subida de medios exige
  sesión autenticada y credenciales. `8.3` sigue bloqueada por diseño: publicar
  un mapa en modo mock requiere login en Supabase, que no está mockeado. **Este
  cambio no archiva ni modifica esas tareas**: cuando se archive el hermano, esa
  decisión se toma entonces y queda registrada aquí.
- **Sin runner de pruebas, la validación es manual** → checklist explícito en
  `tasks.md`; nada se da por hecho porque compile.
- **RLS deshabilitado con ticket abierto en soporte** → restricción dura: ni
  migraciones, ni cambios de privilegios, ni nuevos campos en la RPC.

## Migration Plan

No hay migración de base de datos ni cambio de despliegue: es código del
frontend dentro de lo ya publicado.

1. **Fase A — etiquetas**: prop nueva con defecto apagado. Se revierte quitando
   la prop desde la página pública; el componente vuelve al comportamiento actual.
2. **Fase B — filtros**: estado en la página pública + propiedades nuevas en la
   leyenda. Se revierte por la misma vía; los datos no cambian en ningún momento.
3. **Fase C — gestos**: ampliación de `cambiarZoom` con parámetro opcional y
   manejo de punteros. Revertible por separado al no tocar A ni B.

Las tres fases son aditivas sobre el mismo componente y ninguna escribe en la
base de datos, así que el rollback de cada una es `git revert` de su commits.

## Open Questions

- **Navegación por manzana en el plano público**: queda fuera por decisión
  explícita; si se retoma, se monta sobre `resaltados` igual que los filtros de
  estado, sin tocar este diseño.

*Resuelta durante la implementación:* el umbral de legibilidad de las etiquetas,
que estaba pendiente de probar contra el plano real. Quedó fijado en la decisión
3, con las medidas sobre `ciudadela-san-lucas` (fuente de 11 px y regla de «el
texto cabe en su polígono»).
