-- =============================================
-- 039: DATOS DEL CLIENTE DE UNA RESERVA EN `oportunidades`
-- Ejecutar en el SQL Editor de Supabase (igual que las demas migraciones).
-- Idempotente: se puede ejecutar mas de una vez.
--
-- Reservar un lote NO debe crear un `cliente`: muchos reservan y nunca
-- compran, y eso llenaba la tabla de clientes con gente que solo tomo un
-- lote. Los datos capturados al reservar ahora se guardan como un snapshot
-- en la MISMA oportunidad que la reserva ya crea (etapa = 'reserva'), que
-- liga prospecto <-> lote. No hace falta una tabla nueva: la reserva ya
-- existe en `oportunidades`, solo le faltaban los datos de la persona.
--
-- El snapshot vive en cuatro columnas nuevas (anulables, solo se llenan en la
-- etapa 'reserva') y se copian a `cliente` recien cuando el lote pasa a
-- "vendido" (MaterializarClienteReservaUseCase). Un lote reservado tiene una
-- sola oportunidad 'reserva' activa (se borra al cancelar la reserva).
--
-- Backfill: los clientes que solo existian por una reserva aun no vendida se
-- copian al snapshot de su oportunidad y se borran de `cliente`. Solo se
-- mueven los que:
--   * matchean por email con el prospecto de una oportunidad 'reserva',
--   * el lote de esa oportunidad sigue "reservado",
--   * no tienen ventas ni cotizaciones (o sea, nunca se les vendio).
-- Un cliente con ventas/cotizaciones o que no matchea por email se queda en
-- `cliente` (es un cliente real o no se pudo identificar con seguridad).
-- =============================================

ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS cliente_nombres    TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS cliente_cedula_ruc TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS cliente_email      TEXT;
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS cliente_telefono   TEXT;

-- Consultar la reserva activa de un lote (Reservas, cancelar, vender).
CREATE INDEX IF NOT EXISTS idx_oportunidades_lote_reserva
    ON oportunidades(id_lote) WHERE etapa = 'reserva';

-- ------------------------------------------------------------
-- Backfill: rellenar el snapshot desde el cliente que solo existia
-- por la reserva, y quitarlo de `cliente`. Una sola sentencia
-- (CTE con modificacion de datos) para que sea atomica: si algo
-- falla, no se borra nada.
-- ------------------------------------------------------------
WITH candidatos AS (
    SELECT o.id_oportunidad,
           c.id_cliente,
           c.nombres,
           c.cedula_ruc,
           c.email,
           c.telefono
      FROM oportunidades o
      JOIN lotes l
        ON l.id_lote = o.id_lote
       AND l.estado = 'reservado'
      JOIN prospectos p
        ON p.id_prospecto = o.id_prospecto
       AND p.estado = 'reserva'
      JOIN cliente c
        ON c.email <> ''
       AND lower(c.email) = lower(p.email)
     WHERE o.etapa = 'reserva'
       -- Solo las oportunidades que aun no tienen el snapshot.
       AND o.cliente_nombres IS NULL
       -- Solo los que nunca se les vendio ni se les cotizo.
       AND NOT EXISTS (SELECT 1 FROM ventas v     WHERE v.id_cliente  = c.id_cliente)
       AND NOT EXISTS (SELECT 1 FROM cotizador ct WHERE ct.id_cliente = c.id_cliente)
),
upd AS (
    UPDATE oportunidades o
       SET cliente_nombres    = c.nombres,
           cliente_cedula_ruc = c.cedula_ruc,
           cliente_email      = c.email,
           cliente_telefono   = c.telefono
      FROM candidatos c
     WHERE o.id_oportunidad = c.id_oportunidad
)
DELETE FROM cliente c
 USING candidatos cand
 WHERE c.id_cliente = cand.id_cliente;
