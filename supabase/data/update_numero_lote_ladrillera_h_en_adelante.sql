-- Renombra numero_lote al codigo del inventario (LADRILLERA H en adelante).
-- Ej: '1' en LADRILLERA H -> 'H1'; '3' en LADRILLERA L1 -> 'L1.3'. No modifica estado ni otros campos.
-- Solo toca numeros puros (^\d+$), por lo que es seguro correrlo mas de una vez.
BEGIN;

UPDATE public.lotes AS l
SET numero_lote = v.prefijo || l.numero_lote
FROM (VALUES
  (4,  'H'),
  (5,  'I'),
  (6,  'J'),
  (7,  'K'),
  (8,  'M'),
  (9,  'N'),
  (10, 'O'),
  (11, 'P'),
  (12, 'Q'),
  (13, 'L1.'),
  (14, 'L2.'),
  (15, 'L3.')
) AS v(id_manzana, prefijo)
WHERE l.id_manzana = v.id_manzana
  AND l.numero_lote ~ '^\d+$';

COMMIT;
