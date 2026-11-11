ALTER TABLE public.plan
  ADD COLUMN IF NOT EXISTS precio_anual NUMERIC(12, 2);
