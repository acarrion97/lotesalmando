## 1. Base de datos: la venta nace pendiente

- [x] 1.1 Crear migración `supabase/migrations/040_ventas_estado_segun_cuotas.sql` con `CREATE OR REPLACE` de `aceptar_cotizacion` (conservando los `GRANT` de `012`) para que la venta se inserte en `pendiente`
- [x] 1.2 Verificar con `diff` que el cuerpo de la RPC solo cambia el literal del estado (el resto de la transacción intacta)

## 2. Base de datos: la venta se completa al pagar todo

- [x] 2.1 Crear la función trigger `actualizar_estado_venta_por_cuotas()` con `SECURITY DEFINER` + `SET search_path = public`, que recalcula la venta de la cuota modificada
- [x] 2.2 Agregar las guardas: sin contrato no hace nada, sin cuotas no hace nada, `cancelada` nunca se toca, y solo escribe si el valor cambia
- [x] 2.3 Crear `trg_ventas_estado_por_cuotas` (`AFTER INSERT OR UPDATE OR DELETE ON cobranzas`) y revocarle permisos públicos a la función
- [x] 2.4 Confirmar que no existe `FORCE ROW LEVEL SECURITY` sobre `ventas` (que rompería el `SECURITY DEFINER`)

## 3. Base de datos: backfill

- [x] 3.1 Agregar el `UPDATE` conservador que pasa a `pendiente` las ventas `completada` con cuotas sin pagar (no toca `cancelada`, no toca ventas sin cuotas, idempotente)
- [x] 3.2 Dejar en los comentarios de la migración la verificación a correr aparte

## 4. Modo mock

- [x] 4.1 `MockAceptarCotizacion`: crear la venta en `pendiente`
- [x] 4.2 `MockCobranzaRepository`: recibir `contractRepo` + `saleRepo` y replicar el cálculo del trigger en `create` y `updateEstado`, con las mismas guardas
- [x] 4.3 Cablear `new MockCobranzaRepository(contractRepo, saleRepo)` en `create-repositories.ts`

## 5. UI

- [x] 5.1 Verificar que `InfoVentaLote`, `VentasPage` y `DashboardPage` ya contemplaban `pendiente` (sin cambios necesarios: "Con saldo pendiente", badge PENDIENTE, y el dashboard cuenta `completada || pendiente`)

## 6. Verificación

- [x] 6.1 `tsc -b` y `eslint` sin errores
- [x] 6.2 Aplicar `040` en el SQL Editor de Supabase
- [ ] 6.3 Al aceptar una cotización: la venta queda `pendiente`, el lote `vendido`, y la cotización `aceptada`
- [ ] 6.4 Al pagar la última cuota: la venta pasa a `completada`; al despagar, vuelve a `pendiente`
- [x] 6.5 Ventas históricas impagas en `completada`: ninguna queda `completada` tras el backfill

**Evidencia (2026-10-22, Supabase SQL Editor):**

- `aceptar_cotizacion` → `prosecdef = false` (igual que en `012`, sin cambios de seguridad) y el cuerpo nace `'pendiente'`; `actualizar_estado_venta_por_cuotas` → `prosecdef = true` (SECURITY DEFINER).
- `trg_ventas_estado_por_cuotas` presente sobre `cobranzas`.
- Invariante: `SELECT ... WHERE v.estado = 'completada' AND cuotas_impagas > 0` → **0 filas**.
- `6.3`/`6.4` quedan pendientes de una verificación en vivo (venta nueva y pago de la última cuota).
