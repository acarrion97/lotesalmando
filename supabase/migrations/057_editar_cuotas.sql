-- ============================================================
-- 057: EDITAR MONTO Y VENCIMIENTO DE UNA CUOTA
-- Ejecutar en el SQL Editor de Supabase (igual que las demas
-- migraciones). Idempotente: se puede ejecutar mas de una vez.
--
-- Motivacion: al revisar la cartera vencida aparecen clientes que en
-- `pagos` ya tienen sus cuotas cubiertas. La causa habitual es que la
-- cuota conserva un monto o un vencimiento que no coincide con lo
-- realmente cobrado (importaciones, ajustes manuales, etc.).
--
-- Esta migracion agrega la RPC `editar_cuota`, que:
--   * valida que la cuota pertenezca a la empresa del usuario,
--   * actualiza monto_cuota y fecha_vencimiento,
--   * recalcula el estado con los pagos reales cuando la cuota tiene
--     pagos registrados (mismo criterio que recalcular_estado_cuota),
--   * conserva el estado 'pagada' de cuotas antiguas sin fila en pagos
--     (las que se importaron ya canceladas), para no "despagar" datos
--     historicos solo por editar su vencimiento,
--   * dispara trg_ventas_estado_por_cuotas, que recalcula la venta.
-- ============================================================

CREATE OR REPLACE FUNCTION public.editar_cuota(
  p_id_cobranza INTEGER,
  p_monto_cuota NUMERIC,
  p_fecha_vencimiento DATE
)
RETURNS public.cobranzas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_empresa_id INTEGER;
  v_estado_actual VARCHAR(50);
  v_pagos INTEGER := 0;
  v_estado VARCHAR(50);
  v_cuota public.cobranzas%ROWTYPE;
BEGIN
  IF public.current_empresa_id() IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar la empresa del usuario';
  END IF;
  IF p_monto_cuota IS NULL OR p_monto_cuota <= 0 THEN
    RAISE EXCEPTION 'El monto de la cuota debe ser mayor a cero';
  END IF;
  IF p_fecha_vencimiento IS NULL THEN
    RAISE EXCEPTION 'Indique la fecha de vencimiento de la cuota';
  END IF;

  SELECT c.estado, pr.id_empresa
    INTO v_estado_actual, v_empresa_id
    FROM public.cobranzas c
    JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
    JOIN public.ventas v ON v.id_venta = ct.id_venta
    JOIN public.lotes l ON l.id_lote = v.id_lote
    JOIN public.manzana_bloque mb ON mb.id_manzana = l.id_manzana
    JOIN public.etapas e ON e.id_etapa = mb.id_etapa
    JOIN public.proyectos pr ON pr.id_proyecto = e.id_proyecto
   WHERE c.id_cobranza = p_id_cobranza
   FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No encontramos la cuota a editar';
  END IF;
  IF v_empresa_id IS DISTINCT FROM public.current_empresa_id() THEN
    RAISE EXCEPTION 'No tiene permiso para editar cuotas de esta empresa';
  END IF;

  SELECT count(*) INTO v_pagos
    FROM public.pagos
   WHERE id_cobranza = p_id_cobranza;

  UPDATE public.cobranzas
     SET monto_cuota = p_monto_cuota,
         fecha_vencimiento = p_fecha_vencimiento
   WHERE id_cobranza = p_id_cobranza;

  IF v_pagos > 0 THEN
    -- Hay cobros: el estado sale de lo realmente pagado contra el monto
    -- nuevo (pagada / vencida / pendiente).
    v_estado := public.recalcular_estado_cuota(p_id_cobranza);
  ELSIF v_estado_actual = 'pagada' THEN
    -- Cuota historica marcada como pagada sin fila de pago: se respeta.
    v_estado := 'pagada';
  ELSE
    v_estado := CASE
      WHEN p_fecha_vencimiento < CURRENT_DATE THEN 'vencida'
      ELSE 'pendiente'
    END;
    UPDATE public.cobranzas
       SET estado = v_estado
     WHERE id_cobranza = p_id_cobranza
       AND estado IS DISTINCT FROM v_estado;
  END IF;

  SELECT * INTO v_cuota
    FROM public.cobranzas
   WHERE id_cobranza = p_id_cobranza;

  RETURN v_cuota;
END;
$$;

REVOKE ALL ON FUNCTION public.editar_cuota(INTEGER, NUMERIC, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.editar_cuota(INTEGER, NUMERIC, DATE) TO authenticated;

-- ------------------------------------------------------------
-- 2) Sanear el estado de las cuotas que ya tienen pagos
-- ------------------------------------------------------------
-- El reporte de cartera mostraba cuotas "vencidas" que en `pagos` ya estaban
-- cubiertas: el estado habia quedado desfasado (importaciones, pagos
-- cargados sin recalcular). Se recalcula SOLO donde hay pagos registrados;
-- las cuotas marcadas 'pagada' sin fila de pago (datos historicos
-- importados) se dejan intactas a proposito.
DO $$
DECLARE
  v_id INTEGER;
BEGIN
  FOR v_id IN
    SELECT c.id_cobranza
      FROM public.cobranzas c
     WHERE EXISTS (
       SELECT 1 FROM public.pagos p WHERE p.id_cobranza = c.id_cobranza
     )
  LOOP
    PERFORM public.recalcular_estado_cuota(v_id);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------
-- Verificacion (correr aparte):
--
-- SELECT public.editar_cuota(123, 500, '2026-11-30');
--
-- -- Cuotas que siguen con estado distinto al que dicen sus pagos
-- SELECT c.id_cobranza, c.estado, COALESCE(SUM(p.monto_pagado), 0) AS pagado,
--        c.monto_cuota
--   FROM public.cobranzas c
--   LEFT JOIN public.pagos p ON p.id_cobranza = c.id_cobranza
--  GROUP BY c.id_cobranza, c.estado, c.monto_cuota
-- HAVING (c.estado = 'pagada' AND COALESCE(SUM(p.monto_pagado), 0) > 0
--         AND COALESCE(SUM(p.monto_pagado), 0) < c.monto_cuota)
--     OR (c.estado <> 'pagada' AND COALESCE(SUM(p.monto_pagado), 0) >= c.monto_cuota);
-- ------------------------------------------------------------
