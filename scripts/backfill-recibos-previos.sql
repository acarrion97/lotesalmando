-- ============================================================
-- Backfill de recibos para pagos anteriores al cambio
-- recibos-pago-formato-sri.
--
-- Uso: Supabase → SQL Editor → pegar → Run. Es one-off y
-- idempotente: solo toca pagos que todavía no tienen recibo y
-- no modifica pagos ni cuotas.
--
-- MODO PRUEBA: poner v_modo_prueba := true para que solo
-- cuente cuántos recibos se emitirían, sin insertar nada.
--
-- Antes de correrlo: completá en la app la configuración fiscal
-- del proyecto (razón social, RUC, dirección matriz y de
-- establecimiento, código de establecimiento y punto de emisión).
-- Si falta algún dato, ese pago falla y queda anotado en los
-- NOTICE, sin emitir recibo.
-- ============================================================

DO $$
DECLARE
  -- true = solo cuenta, no inserta. false = emite de verdad.
  v_modo_prueba CONSTANT BOOLEAN := false;
  v_emp RECORD;
  v_pago RECORD;
  v_email TEXT;
  v_emitidos INTEGER := 0;
  v_fallidos INTEGER := 0;
BEGIN
  -- Empresas que tengan al menos un pago sin recibo.
  FOR v_emp IN
    SELECT DISTINCT pr.id_empresa
      FROM public.pagos p
      JOIN public.cobranzas c ON c.id_cobranza = p.id_cobranza
      JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
      JOIN public.ventas v ON v.id_venta = ct.id_venta
      JOIN public.lotes l ON l.id_lote = v.id_lote
      JOIN public.manzana_bloque mb ON mb.id_manzana = l.id_manzana
      JOIN public.etapas e ON e.id_etapa = mb.id_etapa
      JOIN public.proyectos pr ON pr.id_proyecto = e.id_proyecto
     WHERE NOT EXISTS (
       SELECT 1 FROM public.recibos r WHERE r.id_pago = p.id_pago
     )
     ORDER BY pr.id_empresa
  LOOP
    -- crear_recibo_para_pago valida el tenant con current_empresa_id(),
    -- que sale del email del JWT. El SQL Editor corre como postgres (sin
    -- JWT), así que se simula la sesión de un usuario de la empresa.
    SELECT u.email INTO v_email
      FROM public.usuario u
     WHERE u.id_empresa = v_emp.id_empresa
     LIMIT 1;

    IF v_email IS NULL THEN
      RAISE NOTICE 'Empresa %: no tiene usuarios con email; no se emitieron recibos', v_emp.id_empresa;
      CONTINUE;
    END IF;

    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('email', v_email, 'role', 'authenticated')::text,
      true
    );

    IF public.current_empresa_id() IS DISTINCT FROM v_emp.id_empresa THEN
      RAISE NOTICE 'Empresa %: no se pudo fijar el contexto de empresa (current_empresa_id = %)',
        v_emp.id_empresa, public.current_empresa_id();
      CONTINUE;
    END IF;

    FOR v_pago IN
      SELECT p.id_pago, p.id_cobranza
        FROM public.pagos p
       WHERE NOT EXISTS (
         SELECT 1 FROM public.recibos r WHERE r.id_pago = p.id_pago
       )
         AND EXISTS (
           SELECT 1
             FROM public.cobranzas c
             JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
             JOIN public.ventas v ON v.id_venta = ct.id_venta
             JOIN public.lotes l ON l.id_lote = v.id_lote
             JOIN public.manzana_bloque mb ON mb.id_manzana = l.id_manzana
             JOIN public.etapas e ON e.id_etapa = mb.id_etapa
             JOIN public.proyectos pr ON pr.id_proyecto = e.id_proyecto
            WHERE c.id_cobranza = p.id_cobranza
              AND pr.id_empresa = v_emp.id_empresa
         )
       ORDER BY p.id_pago
    LOOP
      BEGIN
        IF v_modo_prueba THEN
          v_emitidos := v_emitidos + 1;
        ELSE
          PERFORM public.crear_recibo_para_pago(v_pago.id_pago, v_pago.id_cobranza);
          v_emitidos := v_emitidos + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_fallidos := v_fallidos + 1;
        RAISE NOTICE 'Pago % (cuota %): %', v_pago.id_pago, v_pago.id_cobranza, SQLERRM;
      END;
    END LOOP;
  END LOOP;

  IF v_modo_prueba THEN
    RAISE NOTICE 'MODO PRUEBA (no insertó nada): recibos que se emitirían: % · con error: %', v_emitidos, v_fallidos;
  ELSE
    RAISE NOTICE 'Recibos emitidos: % · Pagos que fallaron: %', v_emitidos, v_fallidos;
  END IF;
END $$;

-- Verificación: pagos sin recibo que queden (ideal: ninguno).
SELECT p.id_pago,
       p.monto_pagado,
       p.fecha_pago,
       pr.nombre AS proyecto,
       c.numero_cuota
  FROM public.pagos p
  JOIN public.cobranzas c ON c.id_cobranza = p.id_cobranza
  JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
  JOIN public.ventas v ON v.id_venta = ct.id_venta
  JOIN public.lotes l ON l.id_lote = v.id_lote
  JOIN public.manzana_bloque mb ON mb.id_manzana = l.id_manzana
  JOIN public.etapas e ON e.id_etapa = mb.id_etapa
  JOIN public.proyectos pr ON pr.id_proyecto = e.id_proyecto
 WHERE NOT EXISTS (
   SELECT 1 FROM public.recibos r WHERE r.id_pago = p.id_pago
 )
 ORDER BY p.id_pago;
