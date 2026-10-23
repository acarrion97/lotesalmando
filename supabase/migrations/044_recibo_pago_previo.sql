-- ============================================================
-- 044: emisión de recibo para un pago que ya existe.
--
-- Los pagos registrados antes del cambio recibos-pago-formato-sri no
-- tienen fila en `recibos`; este RPC permite emitirlo desde la app
-- (botón «Generar recibo») reservando el número de secuencia de forma
-- atómica, igual que en la confirmación normal.
--
-- Reutiliza crear_recibo_para_pago, que valida la empresa del usuario,
-- la configuración fiscal del proyecto, la identificación del receptor
-- y guarda el snapshot. La restricción `recibos_uno_por_pago` garantiza
-- que un pago no pueda recibir dos recibos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.emitir_recibo_pago_previo(p_id_pago INTEGER)
RETURNS public.recibos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id_cobranza INTEGER;
BEGIN
  IF public.current_empresa_id() IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar la empresa del usuario';
  END IF;

  SELECT p.id_cobranza
    INTO v_id_cobranza
    FROM public.pagos p
   WHERE p.id_pago = p_id_pago;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No encontramos el pago';
  END IF;

  RETURN public.crear_recibo_para_pago(p_id_pago, v_id_cobranza);
END;
$$;

REVOKE ALL ON FUNCTION public.emitir_recibo_pago_previo(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.emitir_recibo_pago_previo(INTEGER) TO authenticated;
