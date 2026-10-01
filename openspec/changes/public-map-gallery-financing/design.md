## Context

Ver `proposal.md` (Why). Contexto técnico mínimo:

- El plano por proyecto vive en la tabla `mapas` (`url_publica`, `slug`) y se sube al bucket `mapas` (solo imágenes, 10 MB) desde la tarjeta "Mapa del proyecto" de Configuración.
- El único acceso anónimo a datos del mapa es el RPC `mapa_publico(slug)` (migración 010): `SECURITY DEFINER`, devuelve nombre del proyecto, URL del plano y los lotes con polígono — explícitamente **sin precios ni clientes**.
- `MapaPublicoPage` (`/mapa/:slug`) renderiza leyenda + `PlanoInteractivo` sin manejar clics (`onLoteClick` no se pasa). `MapasPage` y `LotesPage` ya tienen el patrón de ficha/modal de lote a imitar.
- Hay dos proveedores de datos (`supabase` por defecto, `mock` con `VITE_DATA_PROVIDER=mock`): toda capacidad nueva necesita implementación en ambos lados y registro en `create-repositories.ts` / `create-use-cases.ts`.
- RLS está deshabilitado en las tablas (migración 008); las políticas relevantes están en `storage.objects`.

## Goals / Non-Goals

**Goals:**

- Subir/borrar fotos y videos de un proyecto desde Configuración, con la misma UX que ya tiene la subida del plano.
- Que `/mapa/:slug` concentre galería con carrusel, mapa interactivo con ficha de lote y calculadora de financiamiento, sin crear nuevas URLs públicas.
- Mantener el enlace público como una sola puerta de lectura anónima y decidir explícitamente qué dato nuevo queda expuesto (precio y moneda).

**Non-Goals:**

- Editar o reordenar medios con arrastrar (el orden es el de carga).
- Videos con transcodificación, streaming o reproducción automática.
- Cotización, reserva o registro de contacto desde el enlace público (sigue siendo solo informativo).
- Precios visibles en tooltips, listados o resúmenes públicos (solo al elegir/abrir un lote).

## Decisions

1. **Medios como entidad propia (`proyecto_medios`)** en lugar de un arreglo JSON en `mapas`: cada archivo es una fila con tipo y orden, lo que da borrado puntual, listado estable y cascada por FK con el proyecto. Alternativa descartada: columna JSON (borrados reescritos completos y sin índice para listar).

2. **Bucket nuevo `medios`**, separado de `mapas`: permite `image/png|jpeg|webp` y `video/mp4|webm` con límite de 50 MB sin aflojar el bucket del plano (un solo archivo, 10 MB). Políticas de storage calcadas de la migración 009 (SELECT/INSERT/UPDATE/DELETE para `authenticated`). La ruta del objeto es `proyecto-<id>/<timestamp>-<nombre>` para separar proyectos y evitar respuestas cacheadas al reemplazar.

3. **La galería pública viaja dentro del RPC `mapa_publico`**, junto con `precio_lista` por lote, los conteos por estado y la moneda de la empresa (LEFT JOIN a `configuracion`, fallback `USD`). Alternativa descartada: que la página pública haga `select` directo de `proyecto_medios` — RLS deshabilitado lo permitiría, pero rompe el "una sola puerta" de la migración 010 y multiplica la superficie anónima.

4. **Precio revelado solo al interactuar con el lote**: `PlanoInteractivo` sigue sin `mostrarPrecio` en la pestaña Mapa; el precio aparece en la ficha (clic) y en la calculadora (al elegir el lote). El tooltip mantiene estado/manzana/número. Se documenta en los specs y se corrige el copy de `EnlacePublicoMapa` ("sin precios ni clientes" ya no es exacto).

5. **Pestañas con estado en la URL (`?tab=mapa|galeria|financiamiento`)** usando `useSearchParams` de react-router, dentro de la ruta existente `/mapa/:slug`. Alternativa descartada: rutas hijas (`/mapa/:slug/mapa`) — cambiaría enlaces ya compartidos.

6. **Carrusel propio** en lugar de `Carousel` de antd: necesita flechas grandes tipadas como visor de producto, contador "n de m", miniaturas, navegación con teclado y `<video controls>` sin autoplay; `Carousel` no cubre teclado ni video sin trabajo extra. Se implementa como componente presentacional puro (`CarruselMedios`) reutilizable.

7. **Cálculo financiero en un helper puro** (`src/utils/financiamiento/`): cuota por amortización francesa `cuota = P·i / (1 − (1+i)^−n)` con `i = tasaAnual/12/100`, más monto financiado, intereses totales y total a pagar. Fuera de React para poder probarlo y para que la calculadora solo pinte resultados. Caso `tasa = 0` → `P/n`.

8. **Casos de uso y puertas siguen el patrón existente**: `ProyectoMedioRepository` + `ProyectoMedioStorage` (puerto en `application/proyecto/ports`), casos `SubirMedioProyecto` (sube y registra; si el registro falla borra el archivo), `QuitarMedioProyecto` (borra fila y objeto best-effort) y `GetMediosProyecto`, con implementación Supabase y Mock.

9. **Migración `011_proyecto_medios.sql` idempotente** (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT` en el bucket, `CREATE OR REPLACE FUNCTION`), ejecutable en el SQL Editor como el resto. El SQL anterior de `mapa_publico` queda en la migración 010 como plan de rollback.

10. **`MapaPublico` gana campos** (`medios`, `moneda`, `estadisticas` y `precio_lista` en `PlanoLote`); `MockMapaRepository` los replica con datos de ejemplo para que el modo mock muestre el mismo comportamiento.

## Risks / Trade-offs

- **Exponer `precio_lista` a visitantes anónimos** (antes deliberadamente oculto) → queda confinado al RPC, nunca en tooltips; el copy público y la tarjeta de Configuración lo explican, y ocultarlo de nuevo es revertir una función SQL.
- **Cuota de Storage con videos de 50 MB** → límite por archivo, validación antes de subir y mensaje que recomienda comprimir; el borrado del objeto es best-effort.
- **Reemplazar `mapa_publico` puede romper la pestaña pública si hay error de SQL** → migración idempotente, se prueba el RPC antes del deploy y el rollback es re-ejecutar la función de la migración 010.
- **El borrado de un proyecto no borra sus objetos de storage** (solo las filas, por cascade FK) → se asume igual que el plano actual; se deja indicado en tareas como deuda conocida.
- **Galería sin medios**: la pestaña Galería no debe quedar como primera vista vacía → la página abre en Mapa cuando `medios` viene vacío.

## Migration Plan

1. Ejecutar `supabase/migrations/011_proyecto_medios.sql` en el SQL Editor (crea tabla, bucket, políticas y reemplaza el RPC).
2. Verificar con `select public.mapa_publico('<slug>')`: debe traer `medios`, `precio_lista`, `estadisticas` y `moneda`.
3. Deploy del frontend (Vercel); sin cambios de variables de entorno.
4. Rollback: re-ejecutar el cuerpo de `mapa_publico` de la migración 010 y `DROP TABLE proyecto_medios` + `DROP BUCKET medios` si se requiere.

## Open Questions

- (ninguna que cambie specs, enfoque o desglose de tareas)
