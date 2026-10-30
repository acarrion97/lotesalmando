-- =============================================
-- Lotes al Mando - Permisos del modulo Reportes
-- Ejecutar despues de 045_*.sql
-- =============================================
--
-- `ver_reportes` y `exportar_reportes` ya existen desde 003. Esta migracion
-- solo asegura que el catalogo los tenga y que los roles reciban lo que les
-- corresponde ahora que existe la pagina /reportes:
--   Administrador y Gerente: ver + exportar
--   Vendedor: solo ver (sus datos, por el alcance de ver_registros_de_todos)
--
-- Idempotente: se puede re-ejecutar sin efecto secundario.

INSERT INTO permiso (nombre_permiso, modulo) VALUES
  ('ver_reportes',      'reportes'),
  ('exportar_reportes', 'reportes')
ON CONFLICT DO NOTHING;

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles r
CROSS JOIN permiso p
WHERE (r.nombre_rol IN ('Administrador', 'Gerente') AND p.nombre_permiso IN ('ver_reportes', 'exportar_reportes'))
   OR (r.nombre_rol = 'Vendedor' AND p.nombre_permiso = 'ver_reportes')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;
