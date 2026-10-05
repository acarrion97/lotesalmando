-- Crea el registro de pago de las cuotas 'pagada' que vienen del Excel de clientes y no tienen pago.
-- Alcance: solo contratos de ventas sobre lotes de LADRILLERA H en adelante (id_manzana >= 4), es decir,
-- las 98 ventas del Excel. No toca las 5 ventas de prueba ni los pagos existentes.
-- Solo ventas registradas por el usuario 7, que tambien queda como autor de los pagos; fecha_pago = fecha de vencimiento de la cuota (el Excel no se mapea
-- cuota a cuota). Es seguro repetirlo: solo inserta cuotas pagadas que aun no tienen pago.
BEGIN;

INSERT INTO public.pagos (id_cobranza, id_usuario, monto_pagado, fecha_pago)
SELECT c.id_cobranza,
       7,
       c.monto_cuota,
       COALESCE(c.fecha_vencimiento, c.created_at::date)
FROM public.cobranzas c
JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
JOIN public.ventas v ON v.id_venta = ct.id_venta
JOIN public.lotes l ON l.id_lote = v.id_lote
WHERE l.id_manzana >= 4
  AND v.id_usuario = 7
  AND c.estado = 'pagada'
  AND NOT EXISTS (SELECT 1 FROM public.pagos p WHERE p.id_cobranza = c.id_cobranza);

COMMIT;

-- Verificacion (correr aparte). Para las 98 ventas del Excel se espera:
--   cuotas pagadas = 470,008.69  |  pagos registrados sobre esas cuotas = 470,008.69  |  diferencia 0
SELECT SUM(c.monto_cuota) FILTER (WHERE c.estado = 'pagada')            AS cuotas_pagadas,
       (SELECT SUM(p.monto_pagado) FROM public.pagos p
         WHERE p.id_cobranza IN (SELECT c2.id_cobranza FROM public.cobranzas c2
                                 JOIN public.contratos ct2 ON ct2.id_contrato = c2.id_contrato
                                 JOIN public.ventas v2 ON v2.id_venta = ct2.id_venta
                                 JOIN public.lotes l2 ON l2.id_lote = v2.id_lote
                                 WHERE l2.id_manzana >= 4 AND v2.id_usuario = 7))                AS pagos_registrados,
       SUM(c.monto_cuota) FILTER (WHERE c.estado IN ('pendiente','vencida')) AS saldo_por_cobrar
FROM public.cobranzas c
JOIN public.contratos ct ON ct.id_contrato = c.id_contrato
JOIN public.ventas v ON v.id_venta = ct.id_venta
JOIN public.lotes l ON l.id_lote = v.id_lote
WHERE l.id_manzana >= 4 AND v.id_usuario = 7;
