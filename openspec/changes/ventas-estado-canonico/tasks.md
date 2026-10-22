## 1. Base de datos: normalizar los estados existentes

- [x] 1.1 Crear `supabase/migrations/041_normaliza_estado_ventas.sql`
- [x] 1.2 `UPDATE` de las ventas **con** cuotas: `estado := (todas pagada ? 'completada' : 'pendiente')` por `bool_and`, comparando el valor en crudo para corregir criterio y ortografía en la misma sentencia; excluye `cancelada`
- [x] 1.3 `UPDATE` de las ventas **sin** cuotas: solo normaliza la ortografía de los sinonimos conocidos (`completa`, `confirmada` → `completada`) y los casos con mayúsculas; un valor desconocido se conserva
- [x] 1.4 Dejar en los comentarios las tres verificaciones (inventario por estado, invariante con `lower(btrim())`, conteo de valores fuera de catálogo)

## 2. Base de datos: trigger auto-sanador

- [x] 2.1 Reemplazar `actualizar_estado_venta_por_cuotas()` con `CREATE OR REPLACE` (misma firma, sin dropear el trigger) para que la guarda deje de exigir `estado IN ('pendiente','completada')` y solo respete `cancelada` (vía `lower(btrim())`) o `NULL`
- [x] 2.2 Comparar en crudo al escribir (`estado IS DISTINCT FROM v_nuevo`) para que cualquier variante quede canónica
- [x] 2.3 Mantener intactas las otras reglas: sin contrato no hace nada, sin cuotas no hace nada, `cancelada` nunca se toca

## 3. Modo mock

- [x] 3.1 `MockCobranzaRepository`: la guarda pasa a "solo se respeta `cancelada`", espejo del trigger
- [x] 3.2 Documentar en el JSDoc que replica `040` **y** `041`

## 4. UI

- [x] 4.1 Confirmar que `VentasPage.configDeEstado` ya toleraba valores fuera de catálogo (tag gris con el valor crudo) y que al normalizar los datos las 14 filas vuelven a entrar en stats y filtros sin tocar código

## 5. Verificación

- [x] 5.1 `tsc -b` y `eslint` sin errores
- [ ] 5.2 Aplicar `041` en el SQL Editor de Supabase
- [ ] 5.3 Inventario por estado: solo `pendiente | completada | cancelada` (cero `'completa'`)
- [ ] 5.4 Invariante usando `lower(btrim(estado))`: 0 ventas `completada` con cuotas impagas
- [ ] 5.5 Conteo de valores fuera de catálogo (incluyendo `NULL`): 0
- [ ] 5.6 En la UI: las 14 ventas figuran en las tarjetas y son filtrables por estado
