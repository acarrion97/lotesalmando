-- ============================================================
-- LOTES AL MANDO - ELIMINAR CUOTAS REPETIDAS
-- ============================================================
-- Una cuota repetida es la misma dupla (id_contrato, numero_cuota)
-- insertada mas de una vez: el cliente queda con dos filas para la
-- misma cuota, los pagos se reparten entre ellas y la cartera / el
-- reporte de mora muestran deuda que en realidad no existe.
--
-- Que hace este script:
--   1. DIAGNOSTICO (solo lectura): revisar antes de borrar.
--   2. LIMPIEZA (transaccion): por cada grupo de repetidas elige UNA
--      cuota que se conserva y:
--        * mueve a ella los pagos, recibos y comprobantes de las otras,
--        * borra las filas sobrantes,
--        * recalcula el estado de la cuota que queda.
--   3. VERIFICACION: la consulta debe devolver 0 grupos.
--   4. OPCIONAL: indice unico para que no vuelvan a aparecer.
--
-- Criterio del estado final (conservador, igual que la RPC editar_cuota):
--   * si los pagos cubren el monto -> 'pagada',
--   * si alguna copia estaba 'pagada' -> sigue 'pagada' (no se
--     "despagan" cuotas historicas importadas ya canceladas),
--   * si no, 'vencida' o 'pendiente' segun la fecha de vencimiento.
--
-- Ejecutar en el SQL Editor de Supabase (corre como postgres, sin RLS).
-- Es idempotente: si no hay repetidas, no modifica nada.
--
-- ANTES DE EJECUTAR: exporta el resultado del paso 1 (o un respaldo de
-- `cobranzas`) por si necesitas revisar despues que se borro.
-- ============================================================


-- ============================================================
-- 1) DIAGNOSTICO (solo lectura)
-- ============================================================
WITH grupos AS (
  SELECT id_contrato,
         numero_cuota,
         array_agg(id_cobranza ORDER BY id_cobranza) AS ids
    FROM public.cobranzas
   GROUP BY id_contrato, numero_cuota
  HAVING count(*) > 1
)
SELECT ct.numero_contrato,
       g.id_contrato,
       g.numero_cuota,
       array_length(g.ids, 1) AS copias,
       g.ids AS ids_cobranza,
       (SELECT count(*) FROM public.pagos p WHERE p.id_cobranza = ANY (g.ids)) AS pagos,
       (SELECT COALESCE(sum(p.monto_pagado), 0)
          FROM public.pagos p
         WHERE p.id_cobranza = ANY (g.ids)) AS monto_pagado,
       (SELECT count(*) FROM public.recibos r WHERE r.id_cobranza = ANY (g.ids)) AS recibos
  FROM grupos g
  JOIN public.contratos ct ON ct.id_contrato = g.id_contrato
 ORDER BY ct.numero_contrato, g.numero_cuota;


-- ============================================================
-- 2) LIMPIEZA
-- ============================================================
BEGIN;

DO $$
DECLARE
  g RECORD;
  v_keep INTEGER;
  v_grupo_pagada BOOLEAN;
  v_borradas INTEGER := 0;
  v_movidos INTEGER := 0;
  v_pagado NUMERIC(15, 2);
  v_monto NUMERIC(15, 2);
  v_vencimiento DATE;
  v_estado VARCHAR(50);
  v_total_grupos INTEGER := 0;
  v_total_borradas INTEGER := 0;
  v_total_movidos INTEGER := 0;
BEGIN
  FOR g IN
    SELECT id_contrato, numero_cuota
      FROM public.cobranzas
     GROUP BY id_contrato, numero_cuota
    HAVING count(*) > 1
     ORDER BY id_contrato, numero_cuota
  LOOP
    v_total_grupos := v_total_grupos + 1;

    SELECT bool_or(estado = 'pagada')
      INTO v_grupo_pagada
      FROM public.cobranzas
     WHERE id_contrato = g.id_contrato
       AND numero_cuota = g.numero_cuota;

    -- Se conserva la cuota que ya esta cubierta por sus propios pagos; si
    -- ninguna lo esta, la que tenga pagos; si no, la marcada 'pagada'; y
    -- como desempate la mas antigua (id menor).
    SELECT c.id_cobranza
      INTO v_keep
      FROM public.cobranzas c
     WHERE c.id_contrato = g.id_contrato
       AND c.numero_cuota = g.numero_cuota
     ORDER BY
       (COALESCE((SELECT sum(p.monto_pagado)
                    FROM public.pagos p
                   WHERE p.id_cobranza = c.id_cobranza), 0) >= c.monto_cuota) DESC,
       (EXISTS (SELECT 1
                  FROM public.pagos p
                 WHERE p.id_cobranza = c.id_cobranza)) DESC,
       (c.estado = 'pagada') DESC,
       c.id_cobranza
     LIMIT 1;

    -- Los pagos pasan a la cuota que se conserva (FK ON DELETE RESTRICT).
    UPDATE public.pagos p
       SET id_cobranza = v_keep
     WHERE p.id_cobranza <> v_keep
       AND p.id_cobranza IN (
         SELECT c2.id_cobranza
           FROM public.cobranzas c2
          WHERE c2.id_contrato = g.id_contrato
            AND c2.numero_cuota = g.numero_cuota
       );
    GET DIAGNOSTICS v_movidos = ROW_COUNT;
    v_total_movidos := v_total_movidos + v_movidos;

    -- Recibos que apuntaban a cualquiera de las copias (FK ON DELETE RESTRICT).
    UPDATE public.recibos r
       SET id_cobranza = v_keep
     WHERE r.id_cobranza <> v_keep
       AND r.id_cobranza IN (
         SELECT c2.id_cobranza
           FROM public.cobranzas c2
          WHERE c2.id_contrato = g.id_contrato
            AND c2.numero_cuota = g.numero_cuota
       );

    -- Los comprobantes del portal se conservan (la FK es ON DELETE CASCADE).
    UPDATE public.comprobantes cp
       SET id_cobranza = v_keep
     WHERE cp.id_cobranza <> v_keep
       AND cp.id_cobranza IN (
         SELECT c2.id_cobranza
           FROM public.cobranzas c2
          WHERE c2.id_contrato = g.id_contrato
            AND c2.numero_cuota = g.numero_cuota
       );

    -- Sobrantes. Los avisos de cuota (aviso_cuota) se van con el CASCADE.
    DELETE FROM public.cobranzas c
     WHERE c.id_contrato = g.id_contrato
       AND c.numero_cuota = g.numero_cuota
       AND c.id_cobranza <> v_keep;
    GET DIAGNOSTICS v_borradas = ROW_COUNT;
    v_total_borradas := v_total_borradas + v_borradas;

    -- Estado de la cuota que queda. Escribir aqui dispara
    -- trg_ventas_estado_por_cuotas, que recalcula el estado de la venta.
    SELECT COALESCE(sum(p.monto_pagado), 0)
      INTO v_pagado
      FROM public.pagos p
     WHERE p.id_cobranza = v_keep;

    SELECT monto_cuota, fecha_vencimiento
      INTO v_monto, v_vencimiento
      FROM public.cobranzas
     WHERE id_cobranza = v_keep;

    v_estado := CASE
      WHEN v_pagado >= v_monto THEN 'pagada'
      WHEN v_grupo_pagada THEN 'pagada'
      WHEN v_vencimiento IS NOT NULL AND v_vencimiento < CURRENT_DATE THEN 'vencida'
      ELSE 'pendiente'
    END;

    UPDATE public.cobranzas
       SET estado = v_estado
     WHERE id_cobranza = v_keep
       AND estado IS DISTINCT FROM v_estado;

    RAISE NOTICE 'Contrato % / cuota %: se conserva #%; % repetidas eliminadas; % pagos movidos',
      g.id_contrato, g.numero_cuota, v_keep, v_borradas, v_movidos;
  END LOOP;

  RAISE NOTICE 'Resumen: % grupos, % cuotas eliminadas, % pagos reasignados',
    v_total_grupos, v_total_borradas, v_total_movidos;
END;
$$;

COMMIT;


-- ============================================================
-- 3) VERIFICACION
-- ============================================================
-- Debe devolver 0. Si devuelve mas, revisar el error del paso 2.
SELECT count(*) AS grupos_con_cuotas_repetidas
  FROM (
    SELECT 1
      FROM public.cobranzas
     GROUP BY id_contrato, numero_cuota
    HAVING count(*) > 1
  ) repetidas;


-- ============================================================
-- 4) OPCIONAL: impedir que vuelvan a aparecer
-- ============================================================
-- Ejecutar solo cuando el paso 3 dio 0. A partir de ahi, cualquier
-- intento de insertar dos veces la misma cuota del mismo contrato
-- falla en la base (mejor que descubrirlo semanas despues).
--
-- CREATE UNIQUE INDEX IF NOT EXISTS uq_cobranzas_contrato_cuota
--   ON public.cobranzas (id_contrato, numero_cuota);
