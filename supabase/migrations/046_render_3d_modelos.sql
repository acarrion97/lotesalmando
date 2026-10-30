-- Permite almacenar modelos 3D del proyecto en el mismo bucket público
-- donde ya viven los planos y renders de imagen.
UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'model/obj',
      'model/gltf+json',
      'model/gltf-binary',
      'model/stl',
      'model/vnd.collada+xml',
      'application/octet-stream',
      'application/x-tgif'
    ]
WHERE id = 'mapas';
