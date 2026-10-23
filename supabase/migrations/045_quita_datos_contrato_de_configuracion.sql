-- ============================================================
-- 045: QUITA LOS DATOS LEGALES DEL CONTRATO DE `configuracion`
-- ============================================================
-- La 036 habia agregado a `configuracion` (UNA fila por empresa) los
-- datos legales del contrato: representante, cedula, correo, ciudad,
-- cuentas y direccion de canje. Ese nivel "empresa" generaba
-- configuraciones duplicadas: cada loteo puede ser una razon social
-- distinta, asi que lo correcto es que cada proyecto cargue los suyos.
--
-- Ya existe el lugar correcto: `configuracion_contrato` (038), una fila
-- por (empresa, proyecto), que es donde la app los edita y lee desde
-- Contratos -> Configuracion.
--
-- Se borran las columnas. Son anulables y la app nunca las escribio
-- (`SaveConfiguracionInput` solo envia moneda/idioma, y el logo viaja
-- por separado), asi que no hay datos que migrar.
--
-- Idempotente: se puede ejecutar mas de una vez.
--
-- Verificacion previa (opcional): confirma que no hay nada cargado.
--   SELECT id_empresa, representante, ciudad, cuentas_bancarias
--     FROM configuracion
--    WHERE representante IS NOT NULL
--       OR representante_cedula IS NOT NULL
--       OR representante_email IS NOT NULL
--       OR ciudad IS NOT NULL
--       OR cuentas_bancarias IS NOT NULL
--       OR direccion_canje IS NOT NULL;
--   (si devuelve filas, copialas antes a configuracion_contrato)
-- ============================================================

ALTER TABLE configuracion DROP COLUMN IF EXISTS representante;
ALTER TABLE configuracion DROP COLUMN IF EXISTS representante_cedula;
ALTER TABLE configuracion DROP COLUMN IF EXISTS representante_email;
ALTER TABLE configuracion DROP COLUMN IF EXISTS ciudad;
ALTER TABLE configuracion DROP COLUMN IF EXISTS cuentas_bancarias;
ALTER TABLE configuracion DROP COLUMN IF EXISTS direccion_canje;
