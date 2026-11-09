-- =============================================
-- Lotes al Mando - Permiso eliminar_clientes
-- =============================================
--
-- `ClientesPage` decide el botón "Eliminar" con
-- `usePuede("eliminar_clientes")`, pero el catálogo de permisos
-- (003_seed_roles_permisos y 024_permisos_por_modulo) nunca creó ese
-- permiso: el botón no se mostraba para NINGÚN rol.
--
-- Convención de nombres (src/presentation/permisos): `eliminar_<recurso>`
-- habilita el botón Eliminar del módulo.
--
-- Idempotente: se puede re-ejecutar sin efecto secundario.

INSERT INTO permiso (nombre_permiso, modulo) VALUES
  ('eliminar_clientes', 'clientes')
ON CONFLICT DO NOTHING;

-- Mismos roles que 024 asigna para el módulo clientes: Administrador lo
-- recibe todo, Gerente todo salvo usuarios/configuración y Vendedor ya
-- tenía crear/editar/ver clientes (ahora también puede eliminar los suyos).
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles r
CROSS JOIN permiso p
WHERE p.nombre_permiso = 'eliminar_clientes'
  AND r.nombre_rol IN ('Administrador', 'Gerente', 'Vendedor')
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Mantener la secuencia tras inserciones con id implícito (mismo criterio
-- que 003 y 024).
SELECT setval(
  pg_get_serial_sequence('permiso', 'id_permiso'),
  COALESCE((SELECT MAX(id_permiso) FROM permiso), 1),
  true
);
