-- Normaliza estados para que el dashboard (y el resto de la app) los lea: la app usa
-- ventas: pendiente | completada | cancelada   y   cobranzas: pendiente | pagada | vencida (minusculas).
-- La importacion dejo 'confirmada' y 'Pagada' / 'Pendiente' / 'Vencida'. Solo cambia la columna estado.
BEGIN;

UPDATE public.ventas
SET estado = 'completada'
WHERE lower(btrim(estado)) = 'confirmada';

UPDATE public.cobranzas
SET estado = lower(btrim(estado))
WHERE estado IS DISTINCT FROM lower(btrim(estado));

COMMIT;

-- Verificacion (correr aparte). Esperado tras el update:
--   ventas completada = 103 ($1,607,076.90) | cobranzas pagada = 729 ($478,676.69)
--   pendiente = 3,071 ($1,111,552.02) | vencida = 39 ($11,848.18)
SELECT 'ventas' AS tabla, estado, COUNT(*) AS n, SUM(precio_final) AS monto FROM public.ventas GROUP BY estado
UNION ALL
SELECT 'cobranzas', estado, COUNT(*), SUM(monto_cuota) FROM public.cobranzas GROUP BY estado
ORDER BY 1, 2;
