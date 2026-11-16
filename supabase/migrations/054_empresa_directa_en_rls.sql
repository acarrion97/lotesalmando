-- =============================================
-- Lotes al Mando - RLS por columna id_empresa (cobranzas/contratos/pagos)
-- =============================================
-- PROBLEMA
-- --------
-- Las politicas RLS de `cobranzas`, `contratos` y `pagos` comparaban contra
-- una cadena de funciones anidadas:
--
--   cobranzas : contrato_empresa_id(id_contrato) = current_empresa_id()
--   contratos : venta_empresa_id(id_venta)       = current_empresa_id()
--   pagos     : usuario_empresa_id(id_usuario)   = current_empresa_id()
--
-- Cada fila evaluada ejecuta 3-4 funciones SECURITY DEFINER encadenadas
-- (cobranza -> contrato -> venta -> usuario). Con la tabla real de
-- `cobranzas` (15.691 filas, 9.231 visibles para la empresa activa) eso
-- cuesta ~525 us por fila:
--
--   cobranzas?order=id_cobranza&limit=1000         -> 5.980 ms
--   cobranzas (COUNT de filas visibles)            -> 6.701 ms
--   embed contratos!inner(ventas!inner(usuario...))-> 8.304 ms -> HTTP 500
--   misma consulta sin RLS (service_role)          ->   257 ms
--
-- Se supera el statement_timeout de 8 s de PostgREST y Postgres cancela la
-- consulta con el error 57014, que PostgREST devuelve como 500 Internal
-- Server Error. Es lo que rompia el dashboard (peticiones en rojo a
-- /rest/v1/cobranzas).
--
-- SOLUCION
-- --------
-- Se desnormaliza `id_empresa` en las tres tablas (columna + backfill +
-- indices + triggers que la mantienen sincronizada) y las politicas pasan a
-- comparar una columna:
--
--   id_empresa = (SELECT public.current_empresa_id())
--
-- La subconsulta no correlacionada se evalua UNA vez por consulta (InitPlan)
-- y la comparacion sobre una columna es indexable, por lo que Postgres deja
-- de llamar 4 funciones por fila. Mismo caso de uso, misma seguridad, misma
-- semantica: el usuario solo ve las filas de su empresa.
--
-- Idempotente: se puede volver a ejecutar sin efectos secundarios.
--
-- ROLLBACK (solo si algo sale mal) -> ver seccion ROLLBACK al final.


-- =============================================
-- 1. Columnas
-- =============================================
ALTER TABLE public.contratos ADD COLUMN IF NOT EXISTS id_empresa INTEGER;
ALTER TABLE public.cobranzas ADD COLUMN IF NOT EXISTS id_empresa INTEGER;
ALTER TABLE public.pagos     ADD COLUMN IF NOT EXISTS id_empresa INTEGER;


-- =============================================
-- 2. Backfill
-- =============================================
-- Se recalcula desde la fuente de verdad (contrato -> venta -> usuario ->
-- empresa) con JOINs directos, sin funciones, para que sea rapido aunque la
-- tabla tenga miles de filas.
--
-- Ninguna de las tres tablas puede quedar huerfana: todas sus FK son NOT
-- NULL (`contratos.id_venta`, `cobranzas.id_contrato`, `pagos.id_usuario`),
-- asi que `id_empresa` queda poblado en el 100% de las filas.
--
-- Cada UPDATE solo lee OTRAS tablas en su clausula FROM (nunca la tabla que
-- esta actualizando), que es la forma que Postgres acepta sin ambiguedad.
--
-- Se desactivan los triggers de usuario SOLO durante el backfill:
-- `cobranzas` tiene `trg_ventas_estado_por_cuotas` (migracion 040) que
-- recalcula `ventas.estado` en cada fila; sin esta proteccion dispararia
-- 15.691 veces (lento) y podria modificar `ventas.estado` como efecto
-- secundario no deseado de esta migracion.
-- Si el script fallara a mitad de camino, reactivar a mano con:
--   ALTER TABLE public.cobranzas ENABLE TRIGGER USER;

ALTER TABLE public.contratos DISABLE TRIGGER USER;
ALTER TABLE public.cobranzas DISABLE TRIGGER USER;
ALTER TABLE public.pagos     DISABLE TRIGGER USER;

UPDATE public.contratos ct
   SET id_empresa = u.id_empresa
  FROM public.ventas v
  JOIN public.usuario u ON u.id_usuario = v.id_usuario
 WHERE v.id_venta = ct.id_venta
   AND ct.id_empresa IS DISTINCT FROM u.id_empresa;

UPDATE public.cobranzas c
   SET id_empresa = u.id_empresa
  FROM public.contratos ct
  JOIN public.ventas  v ON v.id_venta   = ct.id_venta
  JOIN public.usuario u ON u.id_usuario = v.id_usuario
 WHERE ct.id_contrato = c.id_contrato
   AND c.id_empresa IS DISTINCT FROM u.id_empresa;

UPDATE public.pagos p
   SET id_empresa = u.id_empresa
  FROM public.usuario u
 WHERE u.id_usuario = p.id_usuario
   AND p.id_empresa IS DISTINCT FROM u.id_empresa;

-- Reactivar SIEMPRE los triggers, aunque el backfill haya fallado arriba.
ALTER TABLE public.contratos ENABLE TRIGGER USER;
ALTER TABLE public.cobranzas ENABLE TRIGGER USER;
ALTER TABLE public.pagos     ENABLE TRIGGER USER;


-- =============================================
-- 3. Indices
-- =============================================
-- (id_empresa, id_cobranza) cubre a la vez el filtro por empresa y el
-- ORDER BY id_cobranza que usa la app al paginar.
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON public.contratos(id_empresa);
CREATE INDEX IF NOT EXISTS idx_cobranzas_empresa ON public.cobranzas(id_empresa, id_cobranza);
CREATE INDEX IF NOT EXISTS idx_pagos_empresa     ON public.pagos(id_empresa);


-- =============================================
-- 4. Triggers: mantener id_empresa sincronizada
-- =============================================
-- Si cambia la venta de un contrato, el usuario de una venta, o se reasigna
-- el contrato de una cuota, `id_empresa` se recalcula solo. Asi la politica
-- RLS nunca queda desactualizada.

CREATE OR REPLACE FUNCTION public.sincronizar_empresa_contrato()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.id_empresa := public.venta_empresa_id(NEW.id_venta);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_empresa_cobranza()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.id_empresa := public.contrato_empresa_id(NEW.id_contrato);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sincronizar_empresa_pago()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.id_empresa := public.usuario_empresa_id(NEW.id_usuario);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contratos_empresa ON public.contratos;
CREATE TRIGGER trg_contratos_empresa
  BEFORE INSERT OR UPDATE OF id_venta
  ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_empresa_contrato();

DROP TRIGGER IF EXISTS trg_cobranzas_empresa ON public.cobranzas;
CREATE TRIGGER trg_cobranzas_empresa
  BEFORE INSERT OR UPDATE OF id_contrato
  ON public.cobranzas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_empresa_cobranza();

DROP TRIGGER IF EXISTS trg_pagos_empresa ON public.pagos;
CREATE TRIGGER trg_pagos_empresa
  BEFORE INSERT OR UPDATE OF id_usuario
  ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_empresa_pago();


-- Si cambia el usuario de una venta hay que arrastrar el cambio a sus
-- contratos y a sus cobranzas. Se fuerza el UPDATE (SET columna = columna)
-- para que disparen sus propios triggers y recalculen desde la fuente.
CREATE OR REPLACE FUNCTION public.sincronizar_empresa_por_venta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
    UPDATE public.contratos
       SET id_venta = id_venta
     WHERE id_venta = NEW.id_venta;

    UPDATE public.cobranzas c
       SET id_contrato = c.id_contrato
      FROM public.contratos ct
     WHERE ct.id_venta = NEW.id_venta
       AND c.id_contrato = ct.id_contrato;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ventas_usuario_empresa ON public.ventas;
CREATE TRIGGER trg_ventas_usuario_empresa
  AFTER UPDATE OF id_usuario
  ON public.ventas
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_empresa_por_venta();


-- Si un usuario cambia de empresa hay que arrastrar el cambio a sus pagos,
-- a sus ventas y a los contratos/cobranzas de esas ventas. Sin esto la
-- politica RLS quedaria evaluando un id_empresa viejo y el usuario veria
-- (o dejaria de ver) filas que no le corresponden.
CREATE OR REPLACE FUNCTION public.sincronizar_empresa_por_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.id_empresa IS DISTINCT FROM OLD.id_empresa THEN

    UPDATE public.pagos p
       SET id_empresa = NEW.id_empresa
     WHERE p.id_usuario = NEW.id_usuario
       AND p.id_empresa IS DISTINCT FROM NEW.id_empresa;

    UPDATE public.contratos ct
       SET id_empresa = NEW.id_empresa
      FROM public.ventas v
     WHERE v.id_venta = ct.id_venta
       AND v.id_usuario = NEW.id_usuario
       AND ct.id_empresa IS DISTINCT FROM NEW.id_empresa;

    UPDATE public.cobranzas c
       SET id_empresa = NEW.id_empresa
      FROM public.contratos ct
      JOIN public.ventas v ON v.id_venta = ct.id_venta
     WHERE ct.id_contrato = c.id_contrato
       AND v.id_usuario = NEW.id_usuario
       AND c.id_empresa IS DISTINCT FROM NEW.id_empresa;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_usuario_empresa ON public.usuario;
CREATE TRIGGER trg_usuario_empresa
  AFTER UPDATE OF id_empresa
  ON public.usuario
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_empresa_por_usuario();


-- =============================================
-- 5. Politicas RLS
-- =============================================
-- Se reemplazan TODAS las politicas de las tres tablas por una unica
-- politica por tabla, para garantizar que no quede ninguna politica vieja
-- (con la cadena de funciones) activa en paralelo. Primero se recolectan los
-- nombres en un array y despues se ejecutan los DROP: asi no se modifica el
-- catalogo con un cursor todavia abierto. Las politicas originales se
-- documentan al final, en la seccion ROLLBACK.

DO $$
DECLARE
  v_stmts TEXT[] := '{}';
  v_pol   RECORD;
  v_stmt  TEXT;
BEGIN
  FOR v_pol IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('cobranzas', 'contratos', 'pagos')
  LOOP
    v_stmts := v_stmts || format('DROP POLICY IF EXISTS %I ON public.%I',
                                 v_pol.policyname, v_pol.tablename);
  END LOOP;

  FOREACH v_stmt IN ARRAY v_stmts LOOP
    EXECUTE v_stmt;
  END LOOP;
END $$;

-- La subconsulta no correlacionada se evalua una sola vez por consulta y la
-- comparacion es sobre una columna indexable: desaparece el costo por fila.
CREATE POLICY cobranzas_all ON public.cobranzas
  FOR ALL TO authenticated
  USING       (id_empresa = (SELECT public.current_empresa_id()))
  WITH CHECK  (id_empresa = (SELECT public.current_empresa_id()));

CREATE POLICY contratos_all ON public.contratos
  FOR ALL TO authenticated
  USING       (id_empresa = (SELECT public.current_empresa_id()))
  WITH CHECK  (id_empresa = (SELECT public.current_empresa_id()));

CREATE POLICY pagos_all ON public.pagos
  FOR ALL TO authenticated
  USING       (id_empresa = (SELECT public.current_empresa_id()))
  WITH CHECK  (id_empresa = (SELECT public.current_empresa_id()));

ALTER TABLE public.cobranzas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos     ENABLE ROW LEVEL SECURITY;

-- Sin esto el planificador sigue usando las estadisticas viejas y puede
-- ignorar los indices recien creados.
ANALYZE public.contratos;
ANALYZE public.cobranzas;
ANALYZE public.pagos;

-- =============================================
-- VERIFICACION (ejecutar a mano, opcional)
-- =============================================
-- SELECT count(*) AS total, count(*) FILTER (WHERE id_empresa IS NOT NULL) AS con_empresa
--   FROM public.cobranzas;
-- -- Se espera: total = 15.691 y con_empresa = 15.691 (las tres tablas no
-- -- admiten huerfanas: todas sus FK son NOT NULL).
--
-- SELECT policyname, qual FROM pg_policies
--  WHERE schemaname='public' AND tablename IN ('cobranzas','contratos','pagos');
-- -- Se espera exactamente 3 politicas, todas con id_empresa = (SELECT ...)

-- =============================================
-- ROLLBACK
-- =============================================
-- Si algo sale mal, restaurar las politicas originales de 006:
--
-- DROP POLICY IF EXISTS cobranzas_all ON public.cobranzas;
-- CREATE POLICY cobranzas_all ON public.cobranzas FOR ALL TO authenticated
--   USING (contrato_empresa_id(id_contrato) = current_empresa_id())
--   WITH CHECK (contrato_empresa_id(id_contrato) = current_empresa_id());
--
-- DROP POLICY IF EXISTS contratos_all ON public.contratos;
-- CREATE POLICY contratos_all ON public.contratos FOR ALL TO authenticated
--   USING (venta_empresa_id(id_venta) = current_empresa_id())
--   WITH CHECK (venta_empresa_id(id_venta) = current_empresa_id());
--
-- DROP POLICY IF EXISTS pagos_all ON public.pagos;
-- CREATE POLICY pagos_all ON public.pagos FOR ALL TO authenticated
--   USING (usuario_empresa_id(id_usuario) = current_empresa_id())
--   WITH CHECK (usuario_empresa_id(id_usuario) = current_empresa_id());
--
-- (Las columnas, indices y triggers pueden quedarse: no afectan si las
--  politicas vuelven a las originales.)
