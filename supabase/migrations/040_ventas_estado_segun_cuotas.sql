-- =============================================
-- 040: ESTADO DE LA VENTA SEGUN SUS CUOTAS
-- Ejecutar en el SQL Editor de Supabase (igual que las demas migraciones).
--
-- Problema: `aceptar_cotizacion` (012) creaba la venta directamente en
-- 'completada' aunque a continuacion generaba todas sus cuotas en 'pendiente'.
-- El resultado: al dar en "Vender" la venta aparecia COMPLETADA con las cuotas
-- sin pagar.
--
-- Ademas no existia NINGUN mecanismo que la pasara a 'completada' cuando se
-- pagaba todo: ni RegisterPagoUseCase ni AprobarComprobanteUseCase ni
-- DetectarCuotasVencidasUseCase tocan `ventas.estado`, y no hay trigger sobre
-- `cobranzas`. Lo unico que lo recalcule es un script one-off
-- (`data/estado_ventas_segun_cuotas.sql`) acotado a un subconjunto puntual.
--
-- Esta migracion hace tres cosas:
--   1. `aceptar_cotizacion` pasa a crear la venta en 'pendiente'.
--   2. Trigger en `cobranzas` que recalcula el estado de la venta cada vez que
--      cambia una cuota: todas 'pagada' => 'completada', si falta alguna =>
--      'pendiente'. Cubre pagos manuales, aprobacion de comprobantes,
--      ediciones manuales e importaciones, sin tocar cada caso de uso.
--   3. Backfill conservador: las ventas ya registradas en 'completada' que
--      todavia tienen cuotas sin pagar pasan a 'pendiente'.
--
-- Reglas:
--   * Nunca se toca una venta 'cancelada'.
--   * Una venta sin cuotas no se modifica (no hay forma de decidir).
--   * Idempotente: se puede ejecutar mas de una vez.
-- =============================================

-- -------------------------------------------------------------
-- 1. aceptar_cotizacion: la venta nace 'pendiente'.
--    CREATE OR REPLACE conserva los GRANT que ya estan dados (012).
--    El cuerpo es identico al de 012 salvo por el estado de la venta.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aceptar_cotizacion(
    p_id_cotizacion INTEGER,
    p_id_usuario INTEGER
)
RETURNS TABLE (
    venta_id INTEGER,
    contrato_id INTEGER,
    cuotas_generadas INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cot RECORD;
    v_estado_anterior VARCHAR(50);
    v_id_venta INTEGER;
    v_id_contrato INTEGER;
    v_financiado DECIMAL(15,2);
    v_cuota DECIMAL(15,2);
    v_fecha_base DATE;
    v_i INTEGER;
BEGIN
    IF p_id_usuario IS NULL THEN
        RAISE EXCEPTION 'Debe indicarse el usuario que registra la venta';
    END IF;

    SELECT c.id_cliente,
           c.id_lote,
           c.precio_ofertado,
           c.monto_entrada,
           c.num_cuotas,
           c.id_asesor,
           c.estado
      INTO v_cot
      FROM cotizador c
     WHERE c.id_cotizacion = p_id_cotizacion
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La cotizacion % no existe', p_id_cotizacion;
    END IF;

    IF v_cot.estado = 'aceptada' THEN
        RAISE EXCEPTION 'La cotizacion % ya fue aceptada', p_id_cotizacion;
    END IF;

    IF EXISTS (SELECT 1 FROM ventas v WHERE v.id_cotizacion = p_id_cotizacion) THEN
        RAISE EXCEPTION 'La cotizacion % ya tiene una venta asociada', p_id_cotizacion;
    END IF;

    IF v_cot.monto_entrada >= v_cot.precio_ofertado THEN
        RAISE EXCEPTION 'La entrada (%) debe ser menor al precio ofertado (%)', v_cot.monto_entrada, v_cot.precio_ofertado;
    END IF;

    IF v_cot.num_cuotas < 1 THEN
        RAISE EXCEPTION 'El numero de cuotas (%) debe ser al menos 1', v_cot.num_cuotas;
    END IF;

    SELECT l.estado
      INTO v_estado_anterior
      FROM lotes l
     WHERE l.id_lote = v_cot.id_lote
       FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El lote % no existe', v_cot.id_lote;
    END IF;

    -- 1. Venta (el asesor se hereda de la cotizacion).
    --    Nace 'pendiente': se completa sola cuando todas sus cuotas
    --    quedan pagadas (ver trg_ventas_estado_por_cuotas).
    INSERT INTO ventas (id_cliente, id_lote, id_cotizacion, id_usuario, precio_final, estado, id_asesor)
    VALUES (v_cot.id_cliente, v_cot.id_lote, p_id_cotizacion, p_id_usuario,
            v_cot.precio_ofertado, 'pendiente', v_cot.id_asesor)
    RETURNING id_venta INTO v_id_venta;

    -- 2. Lote + traza de inventario.
    UPDATE lotes SET estado = 'vendido' WHERE id_lote = v_cot.id_lote;

    INSERT INTO inventario (id_lote, id_usuario, estado_anterior, estado_nuevo)
    VALUES (v_cot.id_lote, p_id_usuario, v_estado_anterior, 'vendido');

    -- 3. Contrato (numero con el mismo formato C-<epoch ms> que ya usan los datos existentes).
    INSERT INTO contratos (id_venta, numero_contrato, monto_total)
    VALUES (v_id_venta,
            'C-' || ((extract(epoch FROM now()) * 1000)::bigint)::text,
            v_cot.precio_ofertado)
    RETURNING id_contrato INTO v_id_contrato;

    -- 4. La cotizacion queda aceptada (el trigger diferido valida al commit,
    --    cuando la venta ya existe).
    UPDATE cotizador SET estado = 'aceptada' WHERE id_cotizacion = p_id_cotizacion;

    -- 5. Plan de cuotas.
    v_financiado := v_cot.precio_ofertado - v_cot.monto_entrada;
    v_cuota := ceil(v_financiado / v_cot.num_cuotas);
    v_fecha_base := CURRENT_DATE;

    FOR v_i IN 1..v_cot.num_cuotas LOOP
        INSERT INTO cobranzas (id_contrato, numero_cuota, monto_cuota, estado, fecha_vencimiento)
        VALUES (
            v_id_contrato,
            v_i,
            CASE WHEN v_i = v_cot.num_cuotas
                 THEN v_financiado - (v_cuota * (v_cot.num_cuotas - 1))
                 ELSE v_cuota
            END,
            'pendiente',
            (v_fecha_base + make_interval(months => v_i))::date
        );
    END LOOP;

    RETURN QUERY SELECT v_id_venta, v_id_contrato, v_cot.num_cuotas;
END;
$$;

-- -------------------------------------------------------------
-- 2. Trigger: el estado de la venta sigue al de sus cuotas.
--    SECURITY DEFINER + search_path fijo, igual que los helpers de la
--    migracion 006: la politica RLS de `ventas` resuelve la empresa
--    via `current_empresa_id()` (auth.email()), que no siempre esta
--    definida en el contexto de un trigger. Con SECURITY DEFINER
--    corremos como propietario de las tablas y evitamos que el UPDATE
--    quede en 0 filas en silencio.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.actualizar_estado_venta_por_cuotas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_venta INTEGER;
    v_id_contrato INTEGER;
    v_total INTEGER := 0;
    v_pagadas INTEGER := 0;
    v_nuevo VARCHAR(50);
BEGIN
    -- La cuota cambia de contrato nunca, pero en DELETE no hay NEW y en
    -- INSERT no hay OLD: se elige explicitamente para no referenciar el
    -- registro que no corresponde a la operacion.
    v_id_contrato := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_contrato ELSE NEW.id_contrato END;

    -- La venta que posee la cuota (via contrato). Sin contrato => nada que hacer.
    SELECT ct.id_venta
      INTO v_id_venta
      FROM contratos ct
     WHERE ct.id_contrato = v_id_contrato;

    IF v_id_venta IS NULL THEN
        RETURN NULL;
    END IF;

    -- Solo interesan las ventas vivas: 'cancelada' jamas se toca, y una
    -- venta sin cuotas no se puede evaluar (queda como esta).
    SELECT v.estado
      INTO v_nuevo
      FROM ventas v
     WHERE v.id_venta = v_id_venta;

    IF v_nuevo IS NULL OR v_nuevo NOT IN ('pendiente', 'completada') THEN
        RETURN NULL;
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE c.estado = 'pagada')
      INTO v_total, v_pagadas
      FROM cobranzas c
      JOIN contratos ct ON ct.id_contrato = c.id_contrato
     WHERE ct.id_venta = v_id_venta;

    IF v_total = 0 THEN
        RETURN NULL;
    END IF;

    v_nuevo := CASE WHEN v_pagadas = v_total THEN 'completada' ELSE 'pendiente' END;

    UPDATE ventas
       SET estado = v_nuevo
     WHERE id_venta = v_id_venta
       AND estado IN ('pendiente', 'completada')
       AND estado IS DISTINCT FROM v_nuevo;

    RETURN NULL;
END;
$$;

-- Sin permisos publicos: solo se usa como trigger.
REVOKE ALL ON FUNCTION public.actualizar_estado_venta_por_cuotas() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_ventas_estado_por_cuotas ON cobranzas;

-- Cualquier alta, baja o cambio de cuota recalcula la venta. En la alta
-- (dentro de la RPC) el calculo da 'pendiente', que es el estado con el que
-- acaba de nacer, asi que no hace ruido.
CREATE TRIGGER trg_ventas_estado_por_cuotas
AFTER INSERT OR UPDATE OR DELETE ON cobranzas
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_estado_venta_por_cuotas();

-- -------------------------------------------------------------
-- 3. Backfill conservador: las ventas 'completada' que todavia tienen
--    cuotas sin pagar pasan a 'pendiente'.
--    * Solo direccion completada -> pendiente (lo pedido).
--    * No toca 'cancelada'.
--    * Solo evalua ventas que tengan al menos una cuota; una venta sin
--      cuotas se queda como esta.
--    Se puede repetir: al pasar todas a 'pendiente', la segunda corrida no
--    modifica filas.
-- -------------------------------------------------------------
UPDATE public.ventas v
   SET estado = 'pendiente'
 WHERE v.estado = 'completada'
   AND EXISTS (
        SELECT 1
          FROM public.contratos ct
          JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
         WHERE ct.id_venta = v.id_venta
           AND c.estado <> 'pagada'
   );

-- -------------------------------------------------------------
-- Verificacion (correr aparte):
--
-- -- Ventas por estado con cuotas impagas: no deberia dar ninguna 'completada'
-- SELECT v.estado, COUNT(*) AS ventas
--   FROM public.ventas v
--  WHERE EXISTS (SELECT 1 FROM public.contratos ct
--                  JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
--                 WHERE ct.id_venta = v.id_venta AND c.estado <> 'pagada')
--  GROUP BY v.estado;
--
-- -- Las ventas recien creadas deben nacer en 'pendiente':
-- SELECT id_venta, estado, created_at FROM public.ventas
--  ORDER BY created_at DESC LIMIT 5;
-- -------------------------------------------------------------
