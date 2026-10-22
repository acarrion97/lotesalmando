-- =============================================
-- 041: ESTADO DE LA VENTA — VARIANTES NO CANONICAS Y TRIGGER AUTO-SANADOR
-- Ejecutar en el SQL Editor de Supabase (igual que las demas migraciones).
-- Idempotente: se puede ejecutar mas de una vez.
--
-- Contexto verificado en vivo el 2026-10-22:
--     SELECT estado, COUNT(*) FROM ventas GROUP BY estado;
--       ->  'completa' = 14   |   'pendiente' = 86
--   No existia NINGUNA fila 'completada'.
--
-- `ventas.estado` es VARCHAR(50) SIN CHECK y la importacion de archivos acepta
-- texto libre, asi que conviven valores fuera del catalogo. Ademas de
-- 'confirmada' (ya corregida por data/normalizar_estados_ventas_cobranzas.sql)
-- aparece 'completa', sin la 'd'.
--
-- Que hizo mal 040 sobre esas 14 filas:
--   * el backfill filtraba `estado = 'completada'`  -> no las alcanzo.
--   * el trigger exigia `estado IN ('pendiente','completada')` y si no
--     cumplia hacia RETURN NULL -> esas ventas quedaban CONGELADAS y jamas se
--     recalculaban, ni pagando todo.
--   * en la UI no entraban en ninguna tarjeta de estadistica ni en los filtros
--     (VentasPage compara contra el catalogo). No rompian el render:
--     `configDeEstado` muestra el valor crudo en un tag gris.
--
-- Esta migracion hace dos cosas:
--   1. Normaliza los estados escritos fuera de catalogo, usando el cobro real
--      como criterio (el mismo que usa el trigger) para las ventas que tienen
--      cuotas, y la sinonimia para las que no tienen ninguna.
--   2. Endurece el trigger: ya no exige que el estado guardado este escrito
--      exactamente 'pendiente'/'completada'. Ahora cualquier venta NO
--      cancelada con cuotas se re-evalua y se escribe en valor canonico.
--
-- Reglas (las mismas de la spec ventas/estado-cuotas):
--   * 'cancelada' jamas se toca.
--   * una venta sin cuotas no se re-evalua (no hay informacion); solo se le
--     normaliza la ortografia de un sinonimo conocido.
--   * idempotente.
-- =============================================

-- -------------------------------------------------------------
-- 1. Ventas CON cuotas: el estado sale del cobro real.
--    Cubre a la vez el criterio (deuda vs. saldada) y la ortografia,
--    porque compara el valor guardado en crudo contra el canonico.
-- -------------------------------------------------------------
WITH cobro AS (
    SELECT ct.id_venta,
           CASE WHEN bool_and(c.estado = 'pagada') THEN 'completada' ELSE 'pendiente' END AS nuevo
      FROM public.contratos ct
      JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
     GROUP BY ct.id_venta
)
UPDATE public.ventas v
   SET estado = cobro.nuevo
  FROM cobro
 WHERE v.id_venta = cobro.id_venta
   AND lower(btrim(v.estado)) <> 'cancelada'
   AND v.estado IS DISTINCT FROM cobro.nuevo;

-- -------------------------------------------------------------
-- 2. Ventas SIN cuotas: no se puede evaluar el cobro, asi que solo se
--    normaliza la ortografia de los sinonimos que ya se conocen
--    ('completa' y 'confirmada' -> 'completada', 'Completada' -> 'completada').
--    Un valor desconocido se respeta: no se inventa un estado.
-- -------------------------------------------------------------
UPDATE public.ventas v
   SET estado = CASE lower(btrim(v.estado))
                  WHEN 'completa'   THEN 'completada'
                  WHEN 'confirmada' THEN 'completada'
                  ELSE lower(btrim(v.estado))
                END
 WHERE NOT EXISTS (
        SELECT 1
          FROM public.contratos ct
          JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
         WHERE ct.id_venta = v.id_venta
   )
   AND (
        v.estado IS DISTINCT FROM lower(btrim(v.estado))
        OR lower(btrim(v.estado)) IN ('completa', 'confirmada')
   );

-- -------------------------------------------------------------
-- 3. Trigger auto-sanador (reemplaza al de 040, misma firma, asi que
--    el trigger existente sigue apuntando a esta version).
--
--    Cambio de guarda: antes exigia `estado IN ('pendiente','completada')`,
--    lo que descartaba cualquier variante sucia y congelaba la venta.
--    Ahora solo se respeta a 'cancelada' (y la venta inexistente); todo lo
--    demas se re-evalua y se escribe en valor canonico.
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
    v_estado TEXT;
    v_total INTEGER := 0;
    v_pagadas INTEGER := 0;
    v_nuevo VARCHAR(50);
BEGIN
    -- En DELETE no hay NEW y en INSERT no hay OLD: se elige explicitamente
    -- para no referenciar el registro que no corresponde a la operacion.
    v_id_contrato := CASE WHEN TG_OP = 'DELETE' THEN OLD.id_contrato ELSE NEW.id_contrato END;

    SELECT ct.id_venta
      INTO v_id_venta
      FROM contratos ct
     WHERE ct.id_contrato = v_id_contrato;

    IF v_id_venta IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT lower(btrim(v.estado))
      INTO v_estado
      FROM ventas v
     WHERE v.id_venta = v_id_venta;

    -- Sin venta, o venta cancelada: jamas se modifica.
    IF v_estado IS NULL OR v_estado = 'cancelada' THEN
        RETURN NULL;
    END IF;

    SELECT count(*),
           count(*) FILTER (WHERE c.estado = 'pagada')
      INTO v_total, v_pagadas
      FROM cobranzas c
      JOIN contratos ct ON ct.id_contrato = c.id_contrato
     WHERE ct.id_venta = v_id_venta;

    -- Sin cuotas no hay como evaluar: queda como esta.
    IF v_total = 0 THEN
        RETURN NULL;
    END IF;

    v_nuevo := CASE WHEN v_pagadas = v_total THEN 'completada' ELSE 'pendiente' END;

    -- Cualquier estado no cancelada se re-evalua y se normaliza. Al comparar
    -- el valor en crudo, las variantes sucias ('completa', 'Confirmada')
    -- quedan escritas en canonico en el proximo cambio de cuota.
    UPDATE ventas
       SET estado = v_nuevo
     WHERE id_venta = v_id_venta
       AND lower(btrim(estado)) <> 'cancelada'
       AND estado IS DISTINCT FROM v_nuevo;

    RETURN NULL;
END;
$$;

-- -------------------------------------------------------------
-- Verificacion (correr aparte).
--
-- -- a) Inventario por estado: solo deberia dar pendiente | completada | cancelada
-- SELECT estado, COUNT(*) FROM public.ventas GROUP BY estado ORDER BY 1;
--
-- -- b) Invariante: DEBE DEVOLVER 0 FILAS
-- SELECT v.id_venta, v.estado, COUNT(*) FILTER (WHERE c.estado <> 'pagada') AS impagas
--   FROM public.ventas v
--   JOIN public.contratos ct ON ct.id_venta = v.id_venta
--   JOIN public.cobranzas  c  ON c.id_contrato = ct.id_contrato
--  WHERE lower(btrim(v.estado)) = 'completada'
--  GROUP BY v.id_venta, v.estado
-- HAVING COUNT(*) FILTER (WHERE c.estado <> 'pagada') > 0;
--
-- -- c) Ningun valor fuera de catalogo:
-- SELECT COUNT(*) FROM public.ventas
--  WHERE estado IS NULL OR lower(btrim(estado)) NOT IN ('pendiente','completada','cancelada');
-- -------------------------------------------------------------
