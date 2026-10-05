-- Ajusta ventas.created_at al mes real de venta segun "DATOS CLIENTES (2).xlsx" (para "Ventas del Mes" del dashboard).
-- Mes = encabezado de seccion del Excel. Dia = primera fecha de pago del cliente si cae en ese mes; si no, dia 1.
-- Solo ventas del Excel (usuario 7, lotes de LADRILLERA H en adelante); no toca las 5 ventas de prueba.
-- Solo modifica ventas.created_at.
BEGIN;

UPDATE public.ventas AS v
SET created_at = f.fecha
FROM (VALUES
  ('LADRILLERA O', 1, '2025-09-26 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 24, '2025-09-26 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 1, '2025-09-26 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 24, '2025-09-26 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 24, '2025-09-27 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 21, '2025-10-03 12:00:00-05'::timestamptz),
  ('LADRILLERA H', 2, '2025-10-06 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 1, '2025-10-06 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 2, '2025-10-06 12:00:00-05'::timestamptz),
  ('LADRILLERA H', 1, '2025-10-06 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 12, '2025-10-28 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 13, '2025-10-28 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 23, '2025-10-15 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 2, '2025-10-20 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 23, '2025-10-27 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 23, '2025-11-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 17, '2025-11-06 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 18, '2025-11-06 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 25, '2025-11-06 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 16, '2025-11-06 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 10, '2025-11-07 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 11, '2025-11-07 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 14, '2025-11-07 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 15, '2025-11-07 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 3, '2025-11-12 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 13, '2025-11-12 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 14, '2025-11-12 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 13, '2025-11-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 6, '2025-11-17 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 4, '2025-11-10 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 26, '2025-11-14 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 22, '2025-11-10 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 20, '2025-11-01 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 3, '2025-11-15 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 4, '2025-11-15 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 1, '2025-11-15 12:00:00-05'::timestamptz),
  ('LADRILLERA H', 3, '2025-11-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 7, '2025-12-03 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 8, '2025-12-03 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 24, '2025-12-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 3, '2025-12-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 2, '2025-12-01 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 5, '2025-12-05 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 9, '2026-01-19 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 20, '2026-03-09 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 21, '2026-03-09 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 22, '2026-03-09 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 21, '2026-03-31 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 20, '2026-03-31 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 23, '2026-03-31 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 22, '2026-03-31 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 24, '2026-03-31 12:00:00-05'::timestamptz),
  ('LADRILLERA M', 3, '2026-04-02 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 19, '2026-04-07 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 18, '2026-04-14 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 20, '2026-04-17 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 8, '2026-04-17 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 9, '2026-04-17 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 16, '2026-04-17 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 17, '2026-04-17 12:00:00-05'::timestamptz),
  ('LADRILLERA M', 11, '2026-04-22 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 19, '2026-05-01 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 19, '2026-05-01 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 6, '2026-05-08 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 7, '2026-05-08 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 12, '2026-05-19 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 22, '2026-05-06 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 10, '2026-05-15 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 11, '2026-05-15 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 15, '2026-05-22 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 18, '2026-05-01 12:00:00-05'::timestamptz),
  ('LADRILLERA M', 1, '2026-05-06 12:00:00-05'::timestamptz),
  ('LADRILLERA O', 12, '2026-05-26 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 4, '2026-05-26 12:00:00-05'::timestamptz),
  ('LADRILLERA P', 14, '2026-06-08 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 9, '2026-06-08 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 6, '2026-06-08 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 7, '2026-06-08 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 8, '2026-06-11 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 25, '2026-06-12 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 2, '2026-06-15 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 3, '2026-06-15 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 4, '2026-06-15 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 22, '2026-06-12 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 10, '2026-06-22 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 15, '2026-06-22 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 16, '2026-06-22 12:00:00-05'::timestamptz),
  ('LADRILLERA Q', 17, '2026-06-22 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 6, '2026-06-01 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 21, '2026-06-01 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 5, '2026-07-01 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 20, '2026-07-06 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 7, '2026-07-07 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 18, '2026-08-11 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 14, '2026-08-20 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 16, '2026-09-02 12:00:00-05'::timestamptz),
  ('LADRILLERA J', 9, '2026-09-09 12:00:00-05'::timestamptz),
  ('LADRILLERA K', 17, '2026-10-01 12:00:00-05'::timestamptz)
) AS f(manzana, nro, fecha)
JOIN public.manzana_bloque m ON m.nombre_codigo = f.manzana
JOIN public.lotes l ON l.id_manzana = m.id_manzana
     AND substring(l.numero_lote from '(\d+)$') = f.nro::text
WHERE v.id_lote = l.id_lote
  AND v.id_usuario = 7;

COMMIT;

-- Verificacion (correr aparte). Esperado por mes: ver comentario de cada fecha; en total 98 ventas.
SELECT to_char(v.created_at AT TIME ZONE 'America/Guayaquil', 'YYYY-MM') AS mes,
       COUNT(*) AS ventas, SUM(v.precio_final) AS valor
FROM public.ventas v
JOIN public.lotes l ON l.id_lote = v.id_lote
WHERE l.id_manzana >= 4 AND v.id_usuario = 7
GROUP BY 1 ORDER BY 1;
