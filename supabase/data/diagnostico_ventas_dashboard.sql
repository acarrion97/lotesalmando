-- DIAGNOSTICO (solo lectura): que hay hoy en las tablas que alimentan el dashboard financiero.
SELECT 'clientes' AS metrica, NULL::text AS detalle, COUNT(*) AS n, NULL::numeric AS monto FROM public.cliente
UNION ALL SELECT 'ventas', estado, COUNT(*), SUM(precio_final) FROM public.ventas GROUP BY estado
UNION ALL SELECT 'contratos', NULL, COUNT(*), SUM(monto_total) FROM public.contratos
UNION ALL SELECT 'cobranzas', estado, COUNT(*), SUM(monto_cuota) FROM public.cobranzas GROUP BY estado
UNION ALL SELECT 'pagos', NULL, COUNT(*), SUM(monto_pagado) FROM public.pagos
UNION ALL SELECT 'lotes vendidos SIN venta', NULL, COUNT(*), NULL
  FROM public.lotes l WHERE l.estado = 'vendido' AND NOT EXISTS (SELECT 1 FROM public.ventas v WHERE v.id_lote = l.id_lote)
UNION ALL SELECT 'ventas cuyo lote NO esta vendido', NULL, COUNT(*), NULL
  FROM public.ventas v JOIN public.lotes l ON l.id_lote = v.id_lote WHERE l.estado <> 'vendido'
ORDER BY 1, 2;
