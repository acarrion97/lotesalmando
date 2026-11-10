-- La unicidad de cédula/RUC se valida en los casos de uso de la aplicación.
-- Se elimina el índice único para que la regla no dependa de la base de datos.
DROP INDEX IF EXISTS public.uq_cliente_empresa_identificacion;
