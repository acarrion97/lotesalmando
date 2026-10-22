-- ============================================================
-- 036: DATOS LEGALES DE LA EMPRESA PARA EL CONTRATO
-- ============================================================
-- El contrato que genera la app es un "COMPROMISO DE ADHESION Y
-- ADQUISICION DE TERRENO" (formato de la companyia). Para armarlo
-- hacen falta datos que hoy no estan en la base: quien representa a
-- la empresa (gerente) y su cedula, la ciudad donde se firma, las
-- cuentas donde se reciben los pagos y la direccion donde se canjean
-- las papeletas de deposito.
--
-- Se guardan en `configuracion` (una fila por empresa, ya existe) para
-- que cada empresa llene los suyos una sola vez y sus contratos
-- salgan completos.
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ============================================================

-- Nombre de quien representa a la empresa (gerente / apoderado).
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS representante TEXT;
-- Cedula del representante.
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS representante_cedula TEXT;
-- Correo electronico del representante.
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS representante_email TEXT;
-- Ciudad donde se firma el contrato (por ejemplo "Machala").
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS ciudad TEXT;
-- Cuentas donde se reciben los pagos (texto libre, una por linea).
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS cuentas_bancarias TEXT;
-- Direccion donde se canjean las papeletas de deposito por recibos.
ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS direccion_canje TEXT;

COMMENT ON COLUMN configuracion.representante IS 'Nombre de quien representa a la empresa en el contrato (gerente/apoderado)';
COMMENT ON COLUMN configuracion.representante_cedula IS 'Cedula del representante de la empresa';
COMMENT ON COLUMN configuracion.representante_email IS 'Correo electronico del representante de la empresa';
COMMENT ON COLUMN configuracion.ciudad IS 'Ciudad donde se firma el contrato';
COMMENT ON COLUMN configuracion.cuentas_bancarias IS 'Cuentas bancarias para el pago del contrato (texto libre)';
COMMENT ON COLUMN configuracion.direccion_canje IS 'Direccion para canjear papeletas de deposito por recibos';
