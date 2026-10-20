## Why

El enlace público `/mapa/:slug` solo muestra el plano con los polígonos de estado: no tiene fotos ni videos del proyecto, no ofrece datos del lote ni una forma de simular el financiamiento, así que el asesor termina mandando la información por WhatsApp por separado. Además, hoy la única carga de imagen posible es el plano del proyecto (solo imágenes PNG/JPG/WEBP de 10 MB), no hay dónde subir fotos o videos del proyecto.

## What Changes

- **Galería de medios por proyecto**: nueva tarjeta "Galería del proyecto" en Configuración para subir, previsualizar y borrar imágenes (PNG/JPG/WEBP) y videos (MP4/WEBM) de un proyecto, con orden explícito.
- **Bucket `medios` en Supabase Storage**: bucket nuevo y público de lectura, con límite de tamaño y tipos MIME propios de imagen y video; el bucket `mapas` queda reservado al plano.
- **Tabla `proyecto_medios`**: registro de cada medio (proyecto, tipo, URL, orden) con borrado en cascada por proyecto.
- **El enlace público gana pestañas**: en `/mapa/:slug` conviven **Galería** (carrusel con flechas anterior/siguiente, miniaturas y contador, tipo visualización de producto de Amazon), **Mapa** (el plano interactivo actual) y **Financiamiento** (datos informativos del proyecto + calculadora), sin cambiar la URL pública.
- **Detalle del lote al hacer clic**: en la pestaña Mapa, hacer clic en un lote abre su ficha (número, manzana, estado y precio), con el mismo patrón de modal que ya usan Mapas y Lotes.
- **Calculadora de financiamiento**: enganche (%), plazo (meses) y tasa de interés anual con cuota mensual, monto financiado, intereses totales y total a pagar; se prellena con el precio del lote cuando el visitante elige o hace clic en uno.
- **Precios: revelados solo al elegir un lote**: los tooltips del plano siguen sin mostrar precios; el precio aparece en la ficha del lote y en la calculadora una vez seleccionado. El RPC `mapa_publico` pasa a devolver `precio_lista` y los medios del proyecto.

## Capabilities

### New Capabilities

- `proyectos/medios`: carga, listado y borrado de imágenes y videos por proyecto desde Configuración, con validación de tipo/tamaño y almacenamiento en Supabase Storage.
- `mapa-publico/visualizacion`: pestañas del enlace público (Galería / Mapa / Financiamiento), carrusel de medios con flechas y miniaturas, y ficha de detalle del lote al hacer clic sobre un polígono.
- `mapa-publico/financiamiento`: calculadora de financiamiento de lote (enganche, plazo, tasa) y datos informativos del proyecto visibles en el enlace público.

### Modified Capabilities

- (ninguna — no hay specs en `openspec/specs/` todavía; los requisitos del mapa público se establecen aquí)

## Impact

- **Migración SQL** `supabase/migrations/011_proyecto_medios.sql`: tabla `proyecto_medios`, bucket `medios` + políticas de storage, y `CREATE OR REPLACE` de `mapa_publico(slug)` que agrega `precio_lista`, `medios` y conteos por estado.
- **Código nuevo**:
  - `src/domain/proyecto/entities/ProyectoMedio.ts` y `src/domain/proyecto/repositories/ProyectoMedioRepository.ts`
  - `src/application/proyecto/ports/ProyectoMedioStorage.ts` y casos de uso `SubirMedioProyecto`, `QuitarMedioProyecto`, `GetMediosProyecto`
  - `src/infrastructure/storage/SupabaseProyectoMedioStorage.ts` + mock, `src/infrastructure/repositories/{supabase,mock}` para medios
  - hooks `useMediosProyecto` / mutaciones; componente `GaleriaProyectoCard` en Configuración
  - componentes públicos `CarruselMedios`, `CalculadoraFinanciamiento`, `FichaLotePublico` y helper `src/utils/financiamiento/`
- **Código modificado**: `SupabaseMapaRepository.getPublicoBySlug` y `MapaPublico`/`PlanoLote` (nuevos campos), `MapaPublicoPage` (pestañas + modal), `ConfiguracionPage` (tarjeta de galería), `EnlacePublicoMapa` (copia: ahora el precio se ve al elegir un lote), `create-repositories.ts` / `create-use-cases.ts` (nuevos casos de uso), `MockMapaRepository`.
- **Dependencias**: ninguna nueva (se usa antd `Tabs`, `Carousel` propio con flechas, `Upload` y `video` nativo).
- **Riesgo**: exponer `precio_lista` en el RPC amplía lo que un visitante anónimo puede leer (era una decisión deliberada en la migración 010); queda limitado a la ficha/calculadora por lote y documentado en los specs.
