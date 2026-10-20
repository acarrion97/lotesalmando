-- ============================================================
-- 033: UBICACIÓN GPS DEL PLANO (capa satélite + vista 3D)
-- ============================================================
-- Para superponer el plano sobre terreno real hay que saber dónde
-- está y a qué escala está dibujado. Se guardan tres datos en la
-- fila del plano (un plano por proyecto):
--
--   * centro_lat / centro_lng: centro de la imagen del plano.
--   * ancho_m: ancho REAL que tiene la imagen en metros. La altura
--     se deduce de la proporción de la imagen (ancho/alto), así que
--     no hace falta cargarla a mano.
--
-- Con eso el front calcula los límites geográficos de la imagen y
-- pide los tiles satelitales (Esri World Imagery, sin API key) que
-- cubren exactamente esa ventana: el plano queda georreferenciado
-- y los polígonos de lotes caen sobre el terreno real.
--
-- La vista 3D del mapa público (y la capa "Render 3D" cuando el
-- proyecto sube un render) también se apoyan en estos datos.
--
-- Ejecutar en el SQL Editor de Supabase (igual que las demás
-- migraciones). Idempotente: se puede ejecutar más de una vez.
-- ============================================================

ALTER TABLE mapas ADD COLUMN IF NOT EXISTS centro_lat DOUBLE PRECISION;
ALTER TABLE mapas ADD COLUMN IF NOT EXISTS centro_lng DOUBLE PRECISION;
ALTER TABLE mapas ADD COLUMN IF NOT EXISTS ancho_m NUMERIC;

COMMENT ON COLUMN mapas.centro_lat IS 'Latitud central de la imagen del plano (WGS84)';
COMMENT ON COLUMN mapas.centro_lng IS 'Longitud central de la imagen del plano (WGS84)';
COMMENT ON COLUMN mapas.ancho_m IS 'Ancho real del plano en metros; la altura sale de la proporción de la imagen';

-- El mapa público también necesita la ubicación: la vista satélite y
-- la vista 3D se ven sin sesión en /mapa/<slug>. Es la definición de
-- la 015 (moneda, medios, estadisticas, superficie/medidas) más los
-- tres campos nuevos.
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
