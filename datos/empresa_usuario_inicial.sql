-- Empresa y usuario de acceso para cargar importar_san_lucas_v2.xlsx.
-- NO se importan por la pantalla de importación (empresa y usuario no están en el
-- catálogo): se crean a mano una sola vez. Ejecutar en el SQL Editor de Supabase.
--
-- Orden:
--   1. Crear el usuario en Supabase > Authentication > Users
--      (email + contraseña; marcar "Auto Confirm User").
--   2. Ejecutar este script con ESE MISMO email.
--   3. Entrar a la app con ese usuario e importar el Excel: los proyectos toman
--      la empresa seleccionada solos y ventas/pagos usan este correo en `usuario`.
--
-- Ajustar razón social, RUC, nombre y correo antes de ejecutar.

INSERT INTO empresa (razon_social, ruc, estado)
SELECT 'Ciudadela San Lucas', NULL, 'activo'
WHERE NOT EXISTS (SELECT 1 FROM empresa WHERE razon_social = 'Ciudadela San Lucas');

INSERT INTO usuario (id_empresa, nombres, email, estado)
SELECT e.id_empresa, 'Administrador San Lucas', 'admin@sanlucas.com', 'activo'
FROM empresa e
WHERE e.razon_social = 'Ciudadela San Lucas'
ON CONFLICT (id_empresa, email) DO NOTHING;

-- Roles y permisos: 003_seed_roles_permisos.sql vincula por usuario.email = 'admin@lotes.com';
-- cambiar ese correo por admin@sanlucas.com si se quiere reutilizar ese script.
