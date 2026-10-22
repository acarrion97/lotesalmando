## Why

Al dar en "Vender" (aceptar la cotización) la venta quedaba registrada como **COMPLETADA**, con todas sus cuotas todavía en `pendiente`. El usuario veía una venta cobrada en su totalidad cuando en verdad solo se había cobrado la entrada.

La causa estaba en la RPC `aceptar_cotizacion` (migración `012`): insertaba la venta con `estado = 'completada'` fijo, y acto seguido generaba el plan de cuotas **todas** en `pendiente`.

Peor todavía: **no existía ningún mecanismo que pasara la venta a `completada` cuando se pagaba todo.**

| Camino | ¿actualizaba `ventas.estado`? |
| --- | --- |
| `RegisterPagoUseCase` (pago) | no — solo `cobranzas.estado = 'pagada'` |
| `AprobarComprobanteUseCase` (comprobante) | no — solo `cobranzas.estado = 'pagada'` |
| `DetectarCuotasVencidasUseCase` | no — solo `cobranzas` |
| Triggers sobre `cobranzas` / `ventas` | **no había ninguno** |

Lo único que recalculaba ese estado era `supabase/data/estado_ventas_segun_cuotas.sql`, un script one-off acotado a un subconjunto puntual (`id_usuario = 7 AND id_manzana >= 4`): un remediado de datos del Excel, no un mecanismo del sistema. `ventas.estado` no era más que un campo que nadie mantenía.

## What Changes

- **La venta nace `pendiente`**: `aceptar_cotizacion` deja de insertar `'completada'`. El lote sigue pasando a `vendido`, con su inventario, contrato, cotización aceptada y plan de cuotas — solo cambia el estado de la venta.
- **La venta se completa sola**: trigger nuevo `trg_ventas_estado_por_cuotas` sobre `cobranzas` (alta, baja o cambio de cuota) que recalcula la venta de su contrato: todas `pagada` → `completada`; si falta alguna → `pendiente`. Cubre pagos manuales, aprobación de comprobantes, detección de vencidas, ediciones manuales e importaciones **sin tocar cada caso de uso**.
- **Las canceladas no se tocan**: el trigger solo escribe sobre `ventas.estado` en `('pendiente', 'completada')`.
- **Backfill**: las ventas ya registradas en `completada` que todavía tienen cuotas sin pagar pasan a `pendiente`.
- **Modo mock**: `MockAceptarCotizacion` nace `pendiente` y `MockCobranzaRepository` replica la regla del trigger, para que `VITE_DATA_PROVIDER=mock` no tenga una semántica distinta.
- **UI sin cambios**: ya contemplaba `pendiente` (`InfoVentaLote`: "Con saldo pendiente"; `VentasPage`: badge PENDIENTE; `DashboardPage`: cuenta `completada || pendiente` como venta realizada).

## Capabilities

### New Capabilities

- `ventas/estado-cuotas`: el estado de una venta refleja el cobro real de su plan de cuotas — nace `pendiente` al vender y pasa a `completada` recién cuando todas sus cuotas están pagadas.

### Modified Capabilities

- ninguna.

## Impact

- **Base de datos**: migración `040_ventas_estado_segun_cuotas.sql` — `CREATE OR REPLACE` de la RPC (conserva los `GRANT`), función trigger `SECURITY DEFINER` con `SET search_path = public` (patrón de la migración `006`), trigger sobre `cobranzas` y backfill. **Aditiva: no cambia esquema ni tipos.**
- **Lógica/aplicación**: `MockCobranzaRepository` (replica el trigger, recibe `contractRepo` + `saleRepo`), `MockAceptarCotizacion` (estado inicial), `create-repositories.ts` (cableado).
- **UI**: sin cambios.
- **Datos/modelos**: sin cambios (`VentaEstado = 'pendiente' | 'completada' | 'cancelada'` ya existía).
- **Riesgos**: el backfill solo corrige en la dirección `completada → pendiente` (ver `design.md` D3); una venta `pendiente` con todas las cuotas pagadas no se flipa hasta que cambie alguna cuota.
