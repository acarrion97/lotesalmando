-- =============================================
-- 033: rol Administrador cuando la empresa pasa a 'pagado'
-- Ejecutar en Supabase SQL Editor (igual que las demas migraciones).
-- Idempotente: se puede ejecutar mas de una vez.
--
-- Cuando el webhook de Hotmart (031) cambia `empresa.estado_pago` a
-- 'pagado', este trigger asigna el rol `Administrador` al PRIMER usuario
-- de esa empresa (el id_usuario mas bajo, es decir la cuenta creada en el
-- registro = el dueño). El resto de los usuarios conserva su rol actual.
--
-- Detalles:
--   * Funcion SECURITY DEFINER: corre con los privilegios del dueño
--     (postgres), asi el RLS de `usuario_rol` no la frena aunque el UPDATE
--     lo haga un usuario comun desde la app.
--   * Idempotente: usa ON CONFLICT DO NOTHING sobre la PK (id_usuario,
--     id_rol), asi que un segundo evento repetido no duplica filas.
--   * No toca nada si el estado no es 'pagado' o si ya lo era.
-- =============================================

CREATE OR REPLACE FUNCTION asignar_rol_admin_empresa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_id_rol     INTEGER;
  v_id_usuario INTEGER;
BEGIN
  -- Solo actua cuando el estado es 'pagado' y (en UPDATE) cambio ahora.
  IF NEW.estado_pago IS DISTINCT FROM 'pagado' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.estado_pago IS DISTINCT FROM 'pagado' THEN
    NULL; -- transicion a 'pagado': sigue abajo
  ELSIF TG_OP = 'INSERT' THEN
    NULL; -- alta ya pagada: tambien aplica
  ELSE
    RETURN NEW; -- seguia en 'pagado': nada que hacer
  END IF;

  -- Rol Administrador: usa el existente; si no esta, lo crea.
  SELECT id_rol INTO v_id_rol
    FROM roles
   WHERE nombre_rol = 'Administrador'
   LIMIT 1;

  IF v_id_rol IS NULL THEN
    INSERT INTO roles (nombre_rol)
    VALUES ('Administrador')
    RETURNING id_rol INTO v_id_rol;
  END IF;

  -- Primer usuario (duenio) de la empresa; prefiere uno activo si lo hay.
  SELECT u.id_usuario INTO v_id_usuario
    FROM usuario u
   WHERE u.id_empresa = NEW.id_empresa
   ORDER BY (u.estado <> 'activo'), u.id_usuario
   LIMIT 1;

  IF v_id_usuario IS NULL THEN
    RETURN NEW; -- empresa sin usuarios todavia: no hay a quien asignar
  END IF;

  INSERT INTO usuario_rol (id_usuario, id_rol, fecha_asignacion)
  VALUES (v_id_usuario, v_id_rol, CURRENT_DATE)
  ON CONFLICT (id_usuario, id_rol) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Solo quien ejecute la migracion puede llamarla.
REVOKE ALL ON FUNCTION asignar_rol_admin_empresa() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_empresa_pagado_rol_admin ON empresa;

CREATE TRIGGER trg_empresa_pagado_rol_admin
AFTER INSERT OR UPDATE ON empresa
FOR EACH ROW
EXECUTE FUNCTION asignar_rol_admin_empresa();

-- -------------------------------------------------------------
-- Backfill (opcional): empresas que ya estan en 'pagado' pero cuyo
-- duenio todavia no tiene el rol. Descomentar para aplicar una vez:
--
-- INSERT INTO usuario_rol (id_usuario, id_rol, fecha_asignacion)
-- SELECT u.id_usuario, r.id_rol, CURRENT_DATE
--   FROM empresa e
--   JOIN usuario u ON u.id_empresa = e.id_empresa
--   CROSS JOIN roles r
--  WHERE e.estado_pago = 'pagado'
--    AND r.nombre_rol = 'Administrador'
--    AND u.id_usuario = (
--          SELECT MIN(u2.id_usuario)
--            FROM usuario u2
--           WHERE u2.id_empresa = e.id_empresa
--        )
-- ON CONFLICT (id_usuario, id_rol) DO NOTHING;
-- -------------------------------------------------------------
