## Why

Al verificar en vivo la migración `040` apareció un problema que esa migración no cubría. El inventario real de `ventas.estado` era:

```
'completa'   = 14
'pendiente'  = 86
```

**No existía ninguna fila `completada`.** Las 14 primeras están escritas con una sola `a`.

`ventas.estado` es `VARCHAR(50)` **sin `CHECK`** y la importación de archivos acepta texto libre, así que conviven valores fuera del catálogo: el repo ya conocía `'confirmada'` (corregida por `data/normalizar_estados_ventas_cobranzas.sql`) y ahora aparece `'completa'`.

La migración `040` las dejó **peor que ignoradas**:

| Mecanismo | Comportamiento con `estado = 'completa'` |
| --- | --- |
| Backfill | `WHERE estado = 'completada'` → **no las alcanzó** |
| Trigger | `IF estado NOT IN ('pendiente','completada') THEN RETURN NULL` → **congeladas**: jamás se recalculaban, ni pagando todo |
| Estadísticas (`VentasPage`) | `claveEstado(...) === "completada"` → **no entraban en ninguna tarjeta** |
| Filtros (`VentasPage`) | `onFilter` compara contra el catálogo → **imposibles de filtrar** |
| Render | ✅ no rompe: `configDeEstado` muestra el valor crudo en un tag gris |

Peor: la verificación del backfill (consulta que filtra `estado = 'completada'`) **daba 0 filas y parecía correcta**, sin cubrir esas 14. El invariante se estaba comprobando con un filtro que excluía los datos sucios.

Es la misma clase de bug que la de `040`, con otra ortografía. Al ser `VARCHAR(50)` sin restricción, **puede volver** con la próxima importación.

## What Changes

- **Normalización de datos**: la migración `041_normaliza_estado_ventas.sql` corrige los estados escritos fuera de catálogo usando **el cobro real** como criterio (el mismo que usa el trigger) para las ventas que tienen cuotas, y la sinonimia (`completa`, `confirmada` → `completada`) para las que no tienen ninguna.
- **Trigger auto-sanador**: la función de `040` se reemplaza para que **ya no exija** que el estado guardado esté escrito exactamente `pendiente`/`completada`. Ahora solo respeta `cancelada`; cualquier otra venta con cuotas se re-evalúa y se escribe en valor canónico. Ninguna variante futura queda congelada.
- **Mock**: `MockCobranzaRepository` replica la misma guarda (solo se respeta `cancelada`).
- **Sin cambios de UI**: `VentasPage` ya toleraba valores desconocidos; al normalizar los datos vuelven a entrar en stats y filtros.

## Capabilities

### New Capabilities

- ninguna.

### Modified Capabilities

- `ventas/estado-cuotas`: se añade el requisito de que los estados fuera de catálogo no rompan el ciclo (normalización por cobro, respeto de `cancelada`, corrección de datos existentes).

## Impact

- **Base de datos**: migración `041_normaliza_estado_ventas.sql` — dos `UPDATE` (idempotentes) + `CREATE OR REPLACE` de la función trigger. **No cambia esquema ni tipos**, y el trigger existente sigue apuntando a la función (misma firma).
- **Lógica/aplicación**: `MockCobranzaRepository` (guarda espejo).
- **UI**: sin cambios.
- **Riesgos**: el `UPDATE` reescribe `ventas.estado` de filas existentes (solo las que difieren del valor correcto); no toca `cancelada` ni las cuotas.
