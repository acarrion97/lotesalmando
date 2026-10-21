-- ============================================================
-- 034: RENDER 3D DEL PROYECTO (capa "Render" en la vista 3D)
-- ============================================================
-- El proyecto puede subir un render 3D propio (imagen PNG/JPG/WEBP,
-- la misma subida que el plano pero guardada como objeto aparte) para
-- que el visitante del mapa público tenga una guía visual en la vista
-- 3D: la imagen se apoya en el plano inclinado y se puede girar y
-- acercar igual que el resto de las capas.
--
--   * mapas.render_3d_url: URL pública del render; NULL si no hay.
--   * mapa_publico lo devuelve para que /mapa/<slug> lo muestre.
--
-- Ejecutar en el SQL Editor de Supabase (igual que las demás
-- migraciones). Idempotente: se puede ejecutar más de una vez.
-- ============================================================

ALTER TABLE mapas ADD COLUMN IF NOT EXISTS render_3d_url TEXT;

COMMENT ON COLUMN mapas.render_3d_url IS 'URL pública del render 3D del proyecto (capa Render de la vista 3D)';

-- Definición de mapa_publico (la de 015 + la ubicación de 033) con el
-- campo nuevo.
CREATE OR REPLACE FUNCTION public.mapa_publico(p_slug TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'proyecto', p.nombre,
    'url_publica', m.url_publica,
    'moneda', COALESCE(c.moneda, 'USD'),
    'centro_lat', m.centro_lat,
    'centro_lng', m.centro_lng,
    'ancho_m', m.ancho_m,
    'render_3d_url', m.render_3d_url,
    'lotes', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id_lote', l.id_lote,
          'id_manzana', l.id_manzana,
          'numero_lote', l.numero_lote,
          'estado', l.estado,
          'manzana', mb.nombre_codigo,
          'precio_lista', l.precio_lista,
          'superficie_m2', l.superficie_m2,
          'medidas', l.medidas,
          'poligono', l.poligono
        )
        ORDER BY mb.nombre_codigo, l.numero_lote
      )
      FROM etapas e
      JOIN manzana_bloque mb ON mb.id_etapa = e.id_etapa
      JOIN lotes l ON l.id_manzana = mb.id_manzana
      WHERE e.id_proyecto = p.id_proyecto
    ), '[]'::json),
    'medios', COALESCE((
      SELECT json_agg(
        json_build_object('url', pm.url, 'tipo', pm.tipo)
        ORDER BY pm.orden DESC, pm.id_proyecto_medio DESC
      )
      FROM proyecto_medios pm
      WHERE pm.id_proyecto = p.id_proyecto
    ), '[]'::json),
    'estadisticas', (
      SELECT json_build_object(
        'total', count(*),
        'disponibles', count(*) FILTER (WHERE l.estado = 'disponible'),
        'reservados', count(*) FILTER (WHERE l.estado = 'reservado'),
        'vendidos', count(*) FILTER (WHERE l.estado = 'vendido')
      )
      FROM etapas e
      JOIN manzana_bloque mb ON mb.id_etapa = e.id_etapa
      JOIN lotes l ON l.id_manzana = mb.id_manzana
      WHERE e.id_proyecto = p.id_proyecto
    )
  )
  FROM mapas m
  JOIN proyectos p ON p.id_proyecto = m.id_proyecto
  LEFT JOIN configuracion c ON c.id_empresa = p.id_empresa
  WHERE m.slug IS NOT NULL
    AND lower(m.slug) = lower(p_slug)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.mapa_publico(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mapa_publico(TEXT) TO anon, authenticated;
