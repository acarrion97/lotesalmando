-- Configuración por empresa de la anticipación del correo de cuotas por vencer.
-- El cron sigue ejecutándose diariamente; el valor define cuántos días antes
-- del vencimiento se permite enviar el aviso.
ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS dias_aviso_cuota INTEGER NOT NULL DEFAULT 5;

ALTER TABLE configuracion
  DROP CONSTRAINT IF EXISTS configuracion_dias_aviso_cuota_rango;

ALTER TABLE configuracion
  ADD CONSTRAINT configuracion_dias_aviso_cuota_rango
  CHECK (dias_aviso_cuota BETWEEN 1 AND 30);

COMMENT ON COLUMN configuracion.dias_aviso_cuota IS
  'Días de anticipación para enviar el correo de cuota por vencer (entre 1 y 30).';
