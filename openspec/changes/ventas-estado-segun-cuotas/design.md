## Context

Ver `proposal.md` (Why). Contexto técnico mínimo:

- `aceptar_cotizacion(INTEGER, INTEGER)` (migración `012`, creada por el cambio `aceptar-cotizacion-genera-venta`) es la única puerta de entrada a registrar una venta: en una sola transacción inserta la venta, mueve el lote a `vendido`, traza inventario, crea el contrato, marca la cotización `aceptada` y genera las cuotas. Devuelve `(venta_id, contrato_id, cuotas_generadas)`.
- `ventas.estado` es `VARCHAR(50)` **sin CHECK** en la BD; los valores usados son `pendiente | completada | cancelada` (`VentaEstado` en el dominio y en `VentaDto`).
- Los pagos llegan por dos caminos: `RegisterPagoUseCase` (pago manual) y `AprobarComprobanteUseCase` (aprobación de comprobante). **Ambos solo hacen `cobranzas.updateEstado(..., 'pagada')`** y no tocan la venta.
- `DetectarCuotasVencidasUseCase` pasa cuotas a `vencida`, también sin tocar la venta.
- RLS sobre `ventas` resuelve la empresa con `usuario_empresa_id(id_usuario) = current_empresa_id()`, y `current_empresa_id()` es `SELECT id_empresa FROM usuario WHERE email = auth.email()` (`SECURITY DEFINER`, migración `006`).
- Proveedor de datos: `supabase` en `.env` y `.env.example` (activo); `mock` es opcional para desarrollo. Los mocks no emulan triggers de BD por sí solos.

## Goals / Non-Goals

**Goals:**

- Que una venta recién registrada **no** aparezca como cobrada cuando solo se cobró la entrada.
- Que `ventas.estado` sea un derivado **confiable** del plan de cuotas, en vez de un literal que nadie mantenía.
- Que el cálculo viva en **un solo lugar** y cubra todos los caminos que modifican cuotas.

**Non-Goals:**

- No se toca el resto de `aceptar_cotizacion` (lote, inventario, contrato, cotización, plan de cuotas, validaciones, permisos).
- No se cambia `ventas.estado` de valores ni se agrega un `CHECK`.
- No se modifica el modelo de cuotas, ni el cálculo `financiado / cuota / redondeo`.
- No se agrega una columna derivada de "saldo" ni se recalcula el saldo de la venta (eso sigue siendo `CuotasPendientesVenta` en UI).
- No se migran pagos ni se re-puntan cuotas.

## Decisions

### D1 · La regla vive en un trigger sobre `cobranzas`, no en la app

**Decisión:** trigger `trg_ventas_estado_por_cuotas` (`AFTER INSERT OR UPDATE OR DELETE`, por fila) que recalcula la venta del contrato de la cuota modificada.

- **Por qué un trigger:** la transición depende de *todas* las cuotas de la venta, y hay más de un camino que las cambia. Un trigger la cubre **sin acoplar la regla a cada caso de uso**.
- **Por qué no en `RegisterPagoUseCase` y `AprobarComprobanteUseCase`:** duplicaría la misma regla en dos (o más) lugares, y quedaría fuera el camino de importación (`infrastructure/export/importarFilas.ts`) y cualquier UPDATE manual sobre `cobranzas`. Cada camino nuevo sería una fuga silenciosa.
- **Por qué `INSERT OR UPDATE OR DELETE` y no solo `UPDATE OF estado`:** si se agrega o elimina una cuota de una venta ya `completada`, la venta deja de estarlo (o empieza a estarlo). Mantiene el invariante sin condiciones extra.
- **Alternativa descartada — columna o vista materializada con saldo:** resuelve el problema del dinero pero no el del estado, que es lo que el usuario ve y filtra; además obligaría a tocar la UI.

### D2 · El trigger es `SECURITY DEFINER` con `SET search_path = public`

**Decisión:** igual que los helpers de la migración `006`.

- **Por qué:** la política `ventas_all` evalúa `usuario_empresa_id(id_usuario) = current_empresa_id()`, y `current_empresa_id()` depende de `auth.email()`. Si el GUC de sesión no está definido en el contexto del trigger, la comparación da `NULL` → `UPDATE` **afecta 0 filas sin ningún error**. La venta quedaría mal *en silencio*, que es peor que fallar. Con `SECURITY DEFINER` corremos como propietario de las tablas y evitamos RLS.
- **Verificado:** no existe `FORCE ROW LEVEL SECURITY` sobre `ventas` en ninguna migración, así que el propietario sí salta RLS.
- `REVOKE ALL ... FROM PUBLIC`: la función solo se usa como trigger, no se expone.

### D3 · Backfill en una sola dirección (conservador)

**Decisión:** la migración solo pasa `completada → pendiente` en las ventas que todavía tienen cuotas sin pagar. No hace el inverso.

- **Por qué:** es exactamente el defecto reportado, y es la corrección que no puede sorprender (una venta impaga que aparezca cobrada es un error visible; una venta ya cobrada que siga en `pendiente` es un error silencioso).
- **Por qué no el inverso:** se decidió explícitamente con el usuario. La regla del trigger cubre el futuro; una venta `pendiente` cuyas cuotas estén todas pagadas pasará a `completada` en cuanto cambie una cuota. Si se quiere forzar ya, corre aparte:
  ```sql
  UPDATE public.ventas v SET estado = 'completada'
   WHERE v.estado = 'pendiente'
     AND EXISTS (SELECT 1 FROM public.contratos ct
                   JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
                  WHERE ct.id_venta = v.id_venta AND c.estado = 'pagada')
     AND NOT EXISTS (SELECT 1 FROM public.contratos ct
                       JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
                      WHERE ct.id_venta = v.id_venta AND c.estado <> 'pagada');
  ```
- **No toca** `cancelada`, **no toca** cuotas, y **no toca** ventas sin cuotas (no hay cómo evaluarlas). Idempotente.

### D4 · La RPC nace `pendiente` explícitamente, no por el trigger

**Decisión:** cambiar el literal a `'pendiente'` en el `INSERT`, además de crear el trigger.

- **Por qué:** el estado inicial es una decisión de negocio (todo empieza cobrando solo la entrada), no algo que deba derivarse. Además, si el plan de cuotas no llegara a insertarse por cualquier motivo, la venta igualmente queda correcta.
- **Cambio mínimo verificado:** `diff` del cuerpo de la función contra el de `012` → **una sola línea funcional** (`'completada'` → `'pendiente'`) más dos líneas de comentario. El resto es idéntico, así que no hay riesgo de regresión en la transacción.
- Se usó `CREATE OR REPLACE` (y no `DROP + CREATE`) **para conservar los `GRANT` a `anon` y `authenticated`** que dio `012`.

### D5 · El modo mock replica la regla

**Decisión:** `MockCobranzaRepository` recibe `contractRepo` y `saleRepo` y recalcula la venta en `create`/`updateEstado`, con las mismas guardas que el trigger.

- **Por qué:** los mocks son "réplica en memoria" de lo que hace la BD (así se documenta `MockAceptarCotizacion`). Si solo se cambiara el estado inicial, el modo mock dejaría las ventas pendientes para siempre — el mismo bug, en otro proveedor.
- **Por qué en el repositorio de cobranzas y no en la app:** así la regla sigue implementada **una sola vez en la app** (cero) y el trigger sigue siendo la única implementación en producción; el mock solo emula el comportamiento del motor al que reemplaza.

## Risks / Trade-offs

- **`ventas.estado` sin `CHECK` (preexistente)** → el trigger solo escribe en `('pendiente', 'completada')`, así que no propaga basura ni pisa `cancelada`. No se agrega `CHECK` por el dato histórico (migración `033`/`normalizar_estados_ventas_cobranzas.sql` ya tuvo que normalizar mayúsculas/minúsculas).
- **Backfill a una sola dirección (D3)** → una venta `pendiente` plenamente pagada puede quedar así hasta que cambie una cuota. Acotado y documentado.
- **Overhead del trigger** → una consulta de conteo por la venta y, como mucho, un `UPDATE` condicionado (`IS DISTINCT FROM`). En la RPC no escribe nada (ya nace `pendiente`), así que la venta nueva no sufre escritura adicional.
- **Ventas sin contrato o sin cuotas** → el trigger las deja tal cual (no hay cómo decidir). En la práctica toda venta creada por la RPC tiene contrato y `num_cuotas >= 1` (validado en la misma función).
- **`SECURITY DEFINER` (D2)** → amplía privilegios de ejecución; se mitiga con `SET search_path = public` (evita el ataque por `search_path`), `REVOKE ... FROM PUBLIC` y con que la función solo actualiza `ventas.estado` bajo guardas estrictas.
- **Modo mock con dependencias nuevas (D5)** → `MockCobranzaRepository` deja de ser autocontenido. Se asume porque el contenedor siempre lo construye junto a `contractRepo` y `saleRepo`.

## Migration Plan

1. Migración `supabase/migrations/040_ventas_estado_segun_cuotas.sql` en el SQL Editor de Supabase: reemplaza la RPC, crea función + trigger, corre el backfill.
2. Despliegue del front (solo afecta al modo mock).
3. **Orden:** no hay dependencia dura con el deploy (el esquema no cambia). Mientras **no** se aplique `040`, las ventas nuevas siguen naciendo mal; aplicarla antes de registrar nuevas ventas.
4. **Rollback:** revertir el deploy trae de vuelta el literal `'completada'` (comportamiento viejo); para quitar el trigger: `DROP TRIGGER trg_ventas_estado_por_cuotas ON cobranzas;` y `DROP FUNCTION public.actualizar_estado_venta_por_cuotas();`. **El backfill no es trivialmente reversible** (no se guardan los valores previos); hay que correr el `UPDATE` de D3 si se quiere revertir el estado histórico.

## Open Questions

- ¿Agregamos el `CHECK (estado IN ('pendiente','completada','cancelada'))` sobre `ventas` una vez limpio el dato histórico?
- ¿Conviene exponer el invariante en la spec como verificación automatizable en algún momento? (El proyecto hoy no tiene framework de tests.)
