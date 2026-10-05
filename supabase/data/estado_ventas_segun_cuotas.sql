-- Estado de la venta segun sus cuotas (solo ventas del Excel: usuario 7, lotes de LADRILLERA H en adelante):
--   'completada' = el contrato no tiene cuotas por cobrar (todas 'pagada')
--   'pendiente'  = el contrato aun tiene alguna cuota 'pendiente' o 'vencida'
-- No toca las ventas de prueba, ni 'cancelada'. Solo modifica ventas.estado. Se puede repetir.
BEGIN;

UPDATE public.ventas AS v
SET estado = CASE
      WHEN EXISTS (SELECT 1
                   FROM public.contratos ct
                   JOIN public.cobranzas c ON c.id_contrato = ct.id_contrato
                   WHERE ct.id_venta = v.id_venta AND c.estado <> 'pagada')
      THEN 'pendiente'
      ELSE 'completada'
    END
FROM public.lotes l
WHERE l.id_lote = v.id_lote
  AND l.id_manzana >= 4
  AND v.id_usuario = 7
  AND v.estado IN ('completada', 'pendiente');

COMMIT;

-- Verificacion (correr aparte). Ventas del Excel por estado y su valor:
SELECT v.estado, COUNT(*) AS ventas, SUM(v.precio_final) AS valor
FROM public.ventas v
JOIN public.lotes l ON l.id_lote = v.id_lote
WHERE l.id_manzana >= 4 AND v.id_usuario = 7
GROUP BY v.estado ORDER BY v.estado;
