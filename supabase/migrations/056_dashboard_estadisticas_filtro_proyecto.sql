-- =============================================
-- Lotes al Mando - Filtro por proyecto en dashboard_estadisticas
-- =============================================
-- PROBLEMA
-- --------
-- El dashboard ("Centro de Mando") tiene un selector "Filtrar por proyecto"
-- que no cambiaba ningun KPI: `dashboard_estadisticas` (migracion 055)
-- devolvia siempre los totales de la empresa entera, asi que al cambiar de
-- proyecto los numeros quedaban identicos.
--
-- SOLUCION
-- --------
-- Se agrega el parametro `p_id_proyecto`:
--
--   NULL (o ausente) -> empresa completa: exactamente los mismos numeros
--                       que hasta ahora, sin regresiones
--   con valor        -> solo los lotes, ventas, cuotas y pagos de ese
--                       proyecto
--
-- El filtro se resuelve en el servidor sobre la cadena
-- proyecto -> etapa -> manzana -> lote, sin descargar filas al cliente:
--
--   lotes   -> manzana_bloque -> etapas -> proyectos
--   ventas  -> lotes          -> manzana_bloque -> etapas -> proyectos
--   cartera -> contratos -> ventas -> lotes -> ... -> proyectos
--   pagos   -> cobranzas -> contratos -> ventas -> ... -> proyectos
--
-- En las secciones 6 y 7 (cartera y pagos) el filtro va envuelto en un
-- CASE: si no hay proyecto, Postgres no llega a evaluar el EXISTS y no paga
-- el costo de la cadena por cada una de las ~15.691 cuotas.
--
-- `proyectos` sigue devolviendo la lista COMPLETA: es la fuente de las
-- opciones del selector. `clientes` y `asesores` no tienen columna de
-- proyecto (son de la empresa), por lo que tampoco se filtran.
--
-- El alcance por empresa y por asesor sigue saliendo de la sesion, nunca
-- del parametro: pedir un proyecto de otra empresa devuelve ceros, porque
-- todas las uniones siguen exigiendo
-- `proyectos.id_empresa = <empresa de la sesion>`.
--
-- Idempotente: se puede volver a ejecutar sin efectos secundarios.
--
-- PostgREST cachea la firma de las funciones: al cambiarla se avisa al
-- final del archivo con `NOTIFY pgrst, 'reload schema'`.

DROP FUNCTION IF EXISTS public.dashboard_estadisticas(TEXT);

CREATE OR REPLACE FUNCTION public.dashboard_estadisticas(
  p_zona_horaria TEXT    DEFAULT 'UTC',
  p_id_proyecto  INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_empresa_id         INTEGER;
  v_id_usuario         INTEGER;
  v_solo_asesor        BOOLEAN := FALSE;
  v_id_asesor          INTEGER;
  v_zona               TEXT;
  v_hoy                TIMESTAMP;
  v_mes_actual         TIMESTAMP;
  v_mes_anterior       TIMESTAMP;
  v_mes_siguiente      TIMESTAMP;
  v_lotes              JSONB;
  v_ventas_mes_actual  BIGINT    := 0;
  v_ventas_mes_anterior BIGINT   := 0;
  v_valor_vendido      NUMERIC   := 0;
  v_cob_total          BIGINT    := 0;
  v_cob_pendiente      BIGINT    := 0;
  v_cob_pagada         BIGINT    := 0;
  v_cob_vencida        BIGINT    := 0;
  v_monto_total        NUMERIC   := 0;
  v_monto_pendiente    NUMERIC   := 0;
  v_monto_pagado       NUMERIC   := 0;
  v_monto_vencido      NUMERIC   := 0;
  v_pagos              NUMERIC   := 0;
  v_clientes           BIGINT    := 0;
  v_asesores           BIGINT    := 0;
  v_proyectos          JSONB;
BEGIN
  -- -------------------------------------------------------
  -- 1) Empresa + usuario de la sesion (mismo origen que RLS)
  -- -------------------------------------------------------
  SELECT u.id_empresa, u.id_usuario
    INTO v_empresa_id, v_id_usuario
    FROM public.usuario u
   WHERE u.email = auth.email()
   LIMIT 1;

  -- Sin empresa no hay datos que mostrar: todo queda en ceros.
  -- (El frontend ni siquiera dispara la consulta si no hay empresa activa.)

  -- -------------------------------------------------------
  -- 2) Alcance por asesor: misma regla que useAlcanceRegistros
  -- -------------------------------------------------------
  -- Quien tiene `ver_registros_de_todos` ve todas las ventas de la empresa;
  -- el resto solo las suyas. Si la cuenta no tiene asesor activo, no ve
  -- ninguna venta (igual que el filtro del cliente).
  IF public.usuario_tiene_permiso('ver_registros_de_todos') THEN
    v_solo_asesor := FALSE;
  ELSE
    v_solo_asesor := TRUE;
    SELECT a.id_asesor
      INTO v_id_asesor
      FROM public.asesores a
     WHERE a.id_usuario = v_id_usuario
       AND a.id_empresa = v_empresa_id
       AND a.estado = 'activo'
     ORDER BY a.id_asesor
     LIMIT 1;
  END IF;

  -- -------------------------------------------------------
  -- 3) Mes actual / mes anterior en la zona del navegador
  -- -------------------------------------------------------
  -- El frontend usaba Date#getMonth del cliente, no UTC: sin la zona el
  -- corte de mes podria correrse unas horas respecto a lo que hoy se ve.
  BEGIN
    v_zona := NULLIF(btrim(COALESCE(p_zona_horaria, '')), '');
    IF v_zona IS NULL THEN
      v_zona := 'UTC';
    END IF;
    v_hoy := now() AT TIME ZONE v_zona;
  EXCEPTION WHEN OTHERS THEN
    v_zona := 'UTC';
    v_hoy := now() AT TIME ZONE 'UTC';
  END;

  v_mes_actual    := date_trunc('month', v_hoy);
  v_mes_siguiente := v_mes_actual + INTERVAL '1 month';
  v_mes_anterior  := v_mes_actual - INTERVAL '1 month';

  -- -------------------------------------------------------
  -- 4) Lotes por estado (cadena proyecto -> etapa -> manzana -> lote)
  -- -------------------------------------------------------
  SELECT jsonb_build_object(
           'total',      COALESCE(SUM(est.cantidad), 0),
           'por_estado', COALESCE(jsonb_object_agg(est.estado, est.cantidad), '{}'::jsonb)
         )
    INTO v_lotes
    FROM (
      SELECT COALESCE(lo.estado, '') AS estado,
             count(*)::BIGINT        AS cantidad
        FROM public.lotes lo
        JOIN public.manzana_bloque mb ON mb.id_manzana = lo.id_manzana
        JOIN public.etapas e          ON e.id_etapa    = mb.id_etapa
        JOIN public.proyectos pr      ON pr.id_proyecto = e.id_proyecto
       WHERE pr.id_empresa = v_empresa_id
         AND (p_id_proyecto IS NULL OR pr.id_proyecto = p_id_proyecto)
       GROUP BY COALESCE(lo.estado, '')
    ) est;

  -- -------------------------------------------------------
  -- 5) Ventas del mes, del mes anterior y valor vendido total
  -- -------------------------------------------------------
  -- Una venta cuenta como realizada tanto si esta completada como
  -- pendiente; solo las canceladas quedan fuera (esVentaRealizada).
  SELECT count(*) FILTER (
           WHERE (ve.created_at AT TIME ZONE v_zona) >= v_mes_actual
             AND (ve.created_at AT TIME ZONE v_zona) <  v_mes_siguiente
             AND lower(trim(ve.estado)) IN ('completada', 'pendiente')
         ),
         count(*) FILTER (
           WHERE (ve.created_at AT TIME ZONE v_zona) >= v_mes_anterior
             AND (ve.created_at AT TIME ZONE v_zona) <  v_mes_actual
             AND lower(trim(ve.estado)) IN ('completada', 'pendiente')
         ),
         COALESCE(sum(ve.precio_final) FILTER (
           WHERE lower(trim(ve.estado)) IN ('completada', 'pendiente')
         ), 0)
    INTO v_ventas_mes_actual, v_ventas_mes_anterior, v_valor_vendido
    FROM public.ventas ve
    JOIN public.lotes lo           ON lo.id_lote    = ve.id_lote
    JOIN public.manzana_bloque mb  ON mb.id_manzana = lo.id_manzana
    JOIN public.etapas e           ON e.id_etapa    = mb.id_etapa
    JOIN public.proyectos pr       ON pr.id_proyecto = e.id_proyecto
   WHERE pr.id_empresa = v_empresa_id
     AND (p_id_proyecto IS NULL OR pr.id_proyecto = p_id_proyecto)
     -- `v_solo_asesor IS NOT TRUE` deja pasar todo cuando no hay filtro;
     -- con filtro y sin asesor vinculado la comparacion da NULL y no
     -- entra ninguna fila, igual que filtrarPorAsesor del cliente.
     AND (v_solo_asesor IS NOT TRUE OR ve.id_asesor = v_id_asesor);

  -- -------------------------------------------------------
  -- 6) Cartera (cuotas): conteos y montos por estado
  -- -------------------------------------------------------
  -- Una cuota pertenece al proyecto de la venta de su contrato. El CASE
  -- evita recorrer esa cadena cuando no hay filtro de proyecto.
  SELECT count(*) FILTER (WHERE co.estado = 'pendiente'),
         count(*) FILTER (WHERE co.estado = 'pagada'),
         count(*) FILTER (WHERE co.estado = 'vencida'),
         count(*),
         COALESCE(sum(co.monto_cuota), 0),
         COALESCE(sum(co.monto_cuota) FILTER (WHERE co.estado = 'pendiente'), 0),
         COALESCE(sum(co.monto_cuota) FILTER (WHERE co.estado = 'pagada'), 0),
         COALESCE(sum(co.monto_cuota) FILTER (WHERE co.estado = 'vencida'), 0)
    INTO v_cob_pendiente, v_cob_pagada, v_cob_vencida, v_cob_total,
         v_monto_total, v_monto_pendiente, v_monto_pagado, v_monto_vencido
    FROM public.cobranzas co
   WHERE co.id_empresa = v_empresa_id
     AND CASE
           WHEN p_id_proyecto IS NULL THEN TRUE
           ELSE EXISTS (
             SELECT 1
               FROM public.contratos ct
               JOIN public.ventas ve          ON ve.id_venta  = ct.id_venta
               JOIN public.lotes lo           ON lo.id_lote   = ve.id_lote
               JOIN public.manzana_bloque mb  ON mb.id_manzana = lo.id_manzana
               JOIN public.etapas e           ON e.id_etapa   = mb.id_etapa
              WHERE ct.id_contrato = co.id_contrato
                AND e.id_proyecto  = p_id_proyecto
           )
         END;

  -- -------------------------------------------------------
  -- 7) Pagos recibidos
  -- -------------------------------------------------------
  -- Mismo conjunto que hoy ve el cliente: los pagos de la empresa (RLS)
  -- que ademas recaen sobre cuotas de la empresa. Con proyecto, solo los
  -- pagos de las cuotas de ese proyecto.
  SELECT COALESCE(sum(pa.monto_pagado), 0)
    INTO v_pagos
    FROM public.pagos pa
   WHERE pa.id_empresa = v_empresa_id
     AND pa.id_cobranza IN (
           SELECT c.id_cobranza
             FROM public.cobranzas c
            WHERE c.id_empresa = v_empresa_id
         )
     AND CASE
           WHEN p_id_proyecto IS NULL THEN TRUE
           ELSE EXISTS (
             SELECT 1
               FROM public.cobranzas co
               JOIN public.contratos ct       ON ct.id_contrato = co.id_contrato
               JOIN public.ventas ve          ON ve.id_venta    = ct.id_venta
               JOIN public.lotes lo           ON lo.id_lote     = ve.id_lote
               JOIN public.manzana_bloque mb  ON mb.id_manzana  = lo.id_manzana
               JOIN public.etapas e           ON e.id_etapa     = mb.id_etapa
              WHERE co.id_cobranza = pa.id_cobranza
                AND e.id_proyecto  = p_id_proyecto
           )
         END;

  -- -------------------------------------------------------
  -- 8) Clientes, asesores activos y lista de proyectos
  -- -------------------------------------------------------
  -- Clientes y asesores no tienen columna de proyecto: se mantienen a
  -- nivel de empresa tambien cuando el dashboard esta filtrado.
  SELECT count(*)
    INTO v_clientes
    FROM public.cliente cl
   WHERE cl.id_empresa = v_empresa_id;

  SELECT count(*)
    INTO v_asesores
    FROM public.asesores ae
   WHERE ae.id_empresa = v_empresa_id
     AND ae.estado = 'activo';

  -- La lista completa (sin filtrar por p_id_proyecto): alimenta las
  -- opciones del selector "Filtrar por proyecto" de la pagina.
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('id_proyecto', pr.id_proyecto, 'nombre', pr.nombre)
             ORDER BY pr.id_proyecto
           ),
           '[]'::jsonb
         )
    INTO v_proyectos
    FROM public.proyectos pr
   WHERE pr.id_empresa = v_empresa_id;

  -- -------------------------------------------------------
  -- 9) Respuesta
  -- -------------------------------------------------------
  RETURN jsonb_build_object(
    'proyectos',        v_proyectos,
    'lotes',            v_lotes,
    'ventas',           jsonb_build_object(
                          'mes_actual',    v_ventas_mes_actual,
                          'mes_anterior',  v_ventas_mes_anterior,
                          'valor_vendido', v_valor_vendido
                        ),
    'cartera',          jsonb_build_object(
                          'total',           v_cob_total,
                          'pendiente',       v_cob_pendiente,
                          'pagada',          v_cob_pagada,
                          'vencida',         v_cob_vencida,
                          'monto_total',     v_monto_total,
                          'monto_pendiente', v_monto_pendiente,
                          'monto_pagado',    v_monto_pagado,
                          'monto_vencido',   v_monto_vencido
                        ),
    'pagos',            jsonb_build_object('total', v_pagos),
    'clientes',         v_clientes,
    'asesores_activos', v_asesores,
    'id_proyecto',      p_id_proyecto,
    'generado_en',      now()
  );
END;
$$;

COMMENT ON FUNCTION public.dashboard_estadisticas(TEXT, INTEGER) IS
  'KPIs del dashboard (lotes, ventas, cartera, pagos, clientes, asesores) agregados en una sola consulta, acotados a la empresa de la sesion y, opcionalmente, a un proyecto (p_id_proyecto).';

-- Solo la sesion autenticada puede ejecutarla; el rol anon no aporta nada
-- aqui (sin email no hay empresa, todo volveria ceros).
REVOKE ALL ON FUNCTION public.dashboard_estadisticas(TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_estadisticas(TEXT, INTEGER) TO authenticated;

-- PostgREST cachea el catalogo de funciones: cambio de firma = recargar.
NOTIFY pgrst, 'reload schema';


-- =============================================
-- VERIFICACION (ejecutar a mano, opcional)
-- =============================================
-- Se espera el mismo dashboard que muestra la app para la empresa activa:
--
--   -- empresa completa (los mismos KPI de siempre)
--   SELECT public.dashboard_estadisticas('America/Argentina/Buenos_Aires');
--
--   -- solo un proyecto: lotes.total baja y los totales de cartera/pagos
--   -- pasan a ser los de las cuotas de ese proyecto
--   SELECT public.dashboard_estadisticas('America/Argentina/Buenos_Aires', 1);
--
-- Controles rapidos sobre el resultado:
--   lotes.total           = disponible + reservado + vendido + en_negociacion
--   cartera.total         = pendiente + pagada + vencida
--   cartera.monto_total   = monto_pendiente + monto_pagado + monto_vencido
--   ventas.valor_vendido  >= 0
--   proyectos             = misma lista con y sin filtro (opciones del selector)
