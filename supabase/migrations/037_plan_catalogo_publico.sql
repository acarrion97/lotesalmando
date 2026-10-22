-- =============================================
-- 036: CATALOGO DE PLANES PUBLICO PARA EL REGISTRO (`plan` -> rol anon)
-- Ejecutar en Supabase SQL Editor (igual que las demas migraciones).
-- Idempotente: se puede ejecutar mas de una vez.
--
-- El registro de agente (/registro/agente) se visita ANTES de tener sesion
-- y tiene que mostrar el resumen del plan de agentes tal como se ve en
-- /planes: nombre, descripcion, precio, limites y link de checkout.
-- La politica 028 (plan_select) es solo para `authenticated`, asi que un
-- visitante anonimo no veia ninguna fila: con esta politica el catalogo
-- es legible publicamente.
--
-- OJO: lo unico sensible que viaja es `url_checkout`, que es el link
-- publico de Hotmart que de todos modos se comparte para vender. La
-- escritura sigue protegida: los permisos crear/editar/eliminar_planes
-- de la 028/030 no cambian.
-- =============================================

ALTER TABLE plan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_select_anon ON plan;
CREATE POLICY plan_select_anon ON plan FOR SELECT TO anon
  USING (true);

-- Verificacion:
--   1) Abrir /registro/agente en una pestana sin sesion.
--   2) Debe aparecer la tarjeta del plan con clave 'agente' (nombre,
--      precio y descripcion), no el aviso "Plan de agentes no disponible".
