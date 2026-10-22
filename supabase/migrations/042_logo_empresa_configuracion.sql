-- ============================================================
-- 042: LOGO DE EMPRESA EN CONFIGURACION
-- Ejecutar en el SQL Editor de Supabase.
-- Idempotente: se puede ejecutar mas de una vez.
-- ============================================================

ALTER TABLE public.configuracion
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.configuracion.logo_url IS
  'URL publica del logo de la empresa almacenado en Supabase Storage.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos-empresa',
  'logos-empresa',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS logos_empresa_select ON storage.objects;
CREATE POLICY logos_empresa_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'logos-empresa');

DROP POLICY IF EXISTS logos_empresa_insert ON storage.objects;
CREATE POLICY logos_empresa_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos-empresa');

DROP POLICY IF EXISTS logos_empresa_update ON storage.objects;
CREATE POLICY logos_empresa_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos-empresa')
  WITH CHECK (bucket_id = 'logos-empresa');

DROP POLICY IF EXISTS logos_empresa_delete ON storage.objects;
CREATE POLICY logos_empresa_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos-empresa');
