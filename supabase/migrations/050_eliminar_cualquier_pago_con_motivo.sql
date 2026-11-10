-- =============================================
-- Lotes al Mando - Permitir eliminar cualquier pago
-- =============================================
-- La auditoría y el motivo obligatorio se mantienen. La única regla que se
-- elimina es la restricción anterior que impedía borrar el pago único de una
-- cuota.

CREATE OR REPLACE FUNCTION public.eliminar_pago(
  p_id_pago INTEGER,
  p_motivo TEXT,
  p_id_usuario INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pago public.pagos%ROWTYPE;
  v_recibo BOOLEAN := FALSE;
  v_estado VARCHAR(50);
BEGIN
  IF public.current_empresa_id() IS NULL THEN
    RAISE EXCEPTION 'No se pudo identificar la empresa del usuario';
  END IF;
  IF p_id_usuario IS NULL
     OR public.usuario_empresa_id(p_id_usuario) IS DISTINCT FROM public.current_empresa_id() THEN
    RAISE EXCEPTION 'El usuario no pertenece a la empresa activa';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) < 5 THEN
    RAISE EXCEPTION 'Indique el motivo de la eliminacion (minimo 5 caracteres)';
  END IF;

  SELECT * INTO v_pago
    FROM public.pagos
   WHERE id_pago = p_id_pago
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pago no existe o ya fue eliminado';
  END IF;

  -- El recibo apunta al pago con FK RESTRICT: se borra primero.
  DELETE FROM public.recibos WHERE id_pago = p_id_pago;
  v_recibo := FOUND;

  INSERT INTO public.pagos_eliminaciones
    (id_pago, id_cobranza, monto_pagado, fecha_pago, forma_pago, motivo, id_usuario)
  VALUES
    (v_pago.id_pago, v_pago.id_cobranza, v_pago.monto_pagado,
     v_pago.fecha_pago, v_pago.forma_pago, btrim(p_motivo), p_id_usuario);

  DELETE FROM public.pagos WHERE id_pago = p_id_pago;

  v_estado := public.recalcular_estado_cuota(v_pago.id_cobranza);

  RETURN jsonb_build_object(
    'id_pago', v_pago.id_pago,
    'id_cobranza', v_pago.id_cobranza,
    'recibo_eliminado', v_recibo,
    'estado_cuota', v_estado
  );
END;
$$;

COMMENT ON FUNCTION public.eliminar_pago(INTEGER, TEXT, INTEGER) IS
  'Elimina cualquier pago de la empresa, exige motivo y conserva auditoria.';
