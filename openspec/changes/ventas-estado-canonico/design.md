## Context

Ver `proposal.md` (Why). Contexto técnico mínimo:

- Cambio `ventas-estado-segun-cuotas` (archivado 2026-10-22): introdujo la migración `040` — la RPC `aceptar_cotizacion` nace `pendiente`, el trigger `trg_ventas_estado_por_cuotas` recalcula la venta según sus cuotas, y un backfill que corrige `completada → pendiente`. La spec `ventas/estado-cuotas` quedó sincronizada en `openspec/specs/`.
- `ventas.estado` es `VARCHAR(50)` **sin `CHECK`** (migración `001`); el tipo de dominio es `VentaEstado = 'pendiente' | 'completada' | 'cancelada'`.
- La UI ya sabe que llegan valores raros: `VentasPage.configDeEstado` normaliza a minúsculas y, si no está en el catálogo, **muestra el valor crudo** en un tag gris en lugar de romper el render. El comentario del propio código lo dice: *"la importación de archivos acepta texto libre, así que puede llegar un valor fuera del catálogo (ej. \"Confirmada\") o null"*.
- Existe el script one-off `supabase/data/normalizar_estados_ventas_cobranzas.sql`, que ya corrigió `'confirmada' → 'completada'` y normalizó mayúsculas en `cobranzas`. No cubrió `'completa'`.
- Dato verificado en vivo (2026-10-22): `completa = 14`, `pendiente = 86`, `completada = 0`.

## Goals / Non-Goals

**Goals:**

- Que **ninguna** venta quede con un estado fuera del catálogo tras aplicar la migración.
- Que el trigger **no pueda ser sorteado** por la ortografía del valor guardado: cualquier variante futura debe autocorregirse.
- Que el criterio de corrección sea el **mismo** en los datos históricos y en el runtime (el cobro real), no una regla nueva.

**Non-Goals:**

- No se agrega `CHECK` a `ventas.estado` (rompería la importación, que es deliberadamente tolerante — ver `VentasPage.configDeEstado`).
- No se toca `cobranzas.estado`, ni la UI, ni la RPC `aceptar_cotizacion`.
- No se migran ni se re-puntan pagos.
- No se normalizan valores desconocidos en ventas sin cuotas (no hay información para decidir; ver D3).

## Decisions

### D1 · Los datos se corrigen con el criterio del cobro, no con una tabla de sinónimos

**Decisión:** para las ventas **con** cuotas, `estado := (todas pagada ? 'completada' : 'pendiente')`, calculado con `bool_and(c.estado = 'pagada')` agrupado por venta.

- **Por qué:** es exactamente la regla de la spec y la que ya aplica el trigger. Corregir los históricos con una tabla de sinónimos habría convertido 14 veces la palabra, **sin** verificar que correspondieran al cobro real — que es justo el error de `040` (asumir que `completada` estaba bien y solo había que bajarla).
- **Por qué un solo `UPDATE ... FROM (CTE)`:** compara el valor **en crudo** (`v.estado IS DISTINCT FROM cobro.nuevo`), así que un mismo statement arregla el criterio *y* la ortografía (`'completa'`, `'Completada'`, `'confirmada'`), y es idempotente: si el valor ya es el correcto, no escribe.

### D2 · El trigger solo respeta `cancelada`; todo lo demás se re-evalúa

**Decisión:** la guarda pasa de `estado IN ('pendiente','completada')` a `lower(btrim(estado)) = 'cancelada'` (o `NULL`).

- **Por qué:** la guarda anterior **condicionaba la corrección a que el dato ya estuviera limpio** — un razonamiento circular: el mecanismo corrector se apagaba justo en los casos que debía corregir. Eso congeló 14 ventas.
- **Por qué `lower(btrim())` al leer y valor crudo al escribir:** se decide con la forma normalizada (así `'Cancelada'` se respeta) pero se **escribe** comparando en crudo (`estado IS DISTINCT FROM v_nuevo`), de modo que cualquier variante queda canónica en la próxima escritura.
- **Por qué seguir respetando `cancelada`:** la spec `ventas/estado-cuotas` lo exige explícitamente, y es lo único que distingue un estado *derivable* de uno *decidido* por el usuario.
- **Alternativa descartada — ampliar la lista de sinónimos dentro del trigger:** mantiene el mismo error estructural: cada sinónimo nuevo tendría que agregarse a mano. Que la guarda sea "todo lo que no sea cancelada" es una sola regla y no admite olvidos.

### D3 · Ventas sin cuotas: solo se normaliza la ortografía de un sinónimo conocido

**Decisión:** si la venta no tiene ninguna cuota, no se le impone un estado derivado (no hay cobro que observar). Solo se corrigen `completa`/`confirmada → completada` y los casos de mayúsculas. Un valor desconocido **se conserva tal cual**.

- **Por qué no derivar:** la spec dice *"Venta sin cuotas → mantener su estado sin modificarlo"*. Sin cuotas, cualquier elección sería inventada.
- **Por qué sí tocar la ortografía de un sinónimo:** `'completa'` **es** `'completada'`; cambiar la escritura no cambia el estado, solo lo hace visible en stats y filtros. Es normalización de *representación*, no de *semántica*.
- **Por qué respetar lo desconocido:** sería arrogante decidir que `'xyz'` significa `pendiente`. Queda a la vista (tag gris, como hoy) y el próximo `042` puede tratarlo si aparece un patrón.

### D4 · Se reemplaza la función, no el trigger

**Decisión:** `CREATE OR REPLACE FUNCTION` con la misma firma; `trg_ventas_estado_por_cuotas` **no** se dropea.

- **Por qué:** el trigger solo invoca a la función. Reemplazar la función actualiza el comportamiento en el acto, sin ciclo de `DROP`/`CREATE` que pueda dejar la tabla sin trigger entre medias si algo falla.

### D5 · No se agrega `CHECK` ni se toca la UI

**Decisión:** fuera de alcance.

- **Por qué no `CHECK`:** la importación es deliberadamente tolerante (comentario en `VentasPage.configDeEstado`); un `CHECK` convertiría un texto libre aceptado en un error de importación. Sería un cambio de comportamiento aparte, con su propio análisis.
- **Por qué no `VentasPage`:** ya muestra el valor crudo sin romper. Al normalizar los datos, las 14 filas vuelven a entrar en las tarjetas y en los filtros sin código nuevo. Que la UI tolere valores raros sigue siendo correcto mientras no haya `CHECK`.

## Risks / Trade-offs

- **El `UPDATE` reescribe `ventas.estado`** → solo sobre filas cuyo valor difiere del correcto (guarda `IS DISTINCT FROM`), no toca `cancelada` ni las cuotas. No guarda el valor previo: si se quisiera revertir, hay que reponerlo a mano.
- **La guarda amplia del trigger (D2) puede sobrescribir un estado desconocido** → solo si la venta tiene cuotas, que es cuando hay información real para derivar el estado. Si en el futuro se agrega un estado legítimo derivable-distinto (p. ej. `anulada`), habrá que excluirlo en la guarda y cambiar el tipo `VentaEstado` a la vez. Riesgo conocido y acotado.
- **`VARCHAR(50)` sigue sin `CHECK` (D5)** → la importación puede volver a traer `'Confirmada'` u otra variante. La diferencia es que **ahora no la congela**: el trigger la normaliza con el próximo cambio de cuota. Queda como mejora futura el `CHECK` una vez decidida la política de importación.
- **La normalización de datos es irreversible sin respaldo** → el script de verificación está en los comentarios de `041`; conviene correrlo antes/después.
- **Verificación previa incompleta** → el filtro `estado = 'completada'` usada en `040` no cubre variantes. Las verificaciones de `041` usan `lower(btrim(estado))` y agregan un conteo de valores fuera de catálogo, precisamente para que esto no vuelva a pasar desapercibido.

## Migration Plan

1. Migración `supabase/migrations/041_normaliza_estado_ventas.sql` en el SQL Editor de Supabase (dos `UPDATE` + `CREATE OR REPLACE` de la función).
2. Despliegue del front (solo cambia el guardia del mock).
3. **Orden:** sin dependencia dura con el deploy. **Sin aplicar `041`**, las 14 ventas siguen congeladas.
4. **Rollback:** revertir el deploy trae la guarda vieja del trigger (con el congelamiento). Los datos normalizados no se revierten solos: habría que reponer `estado` a mano sobre las filas afectadas.

## Open Questions

- ¿Agregar `CHECK` sobre `ventas.estado` y hacer fallar (o rechazar) la importación con texto fuera de catálogo?
- ¿Conviene que la importación aplique la misma normalización al subir, en vez de confiar en el trigger para corregirla después?
