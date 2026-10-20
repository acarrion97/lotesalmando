-- ============================================================
-- 035: CONTRATOS CON DOCUMENTO Y COMPROBANTES DE PAGO
-- ============================================================
-- Dos cosas que hoy no existen:
--
--   A) Documento del contrato. La tabla `contratos` guarda solo la
--      fila (numero, monto) creada por la RPC aceptar_cotizacion; no
--      hay archivo. Se agregan las columnas del documento anexado y
--      el portal/backoffice pueden generar uno (.docx/.pdf) con los
--      datos existentes y guardarlo aca.
--
--   B) Comprobantes de pago. El cliente sube una imagen o un PDF con
--      el valor que pago, identificandose solo con su cedula. Queda
--      en estado 'pendiente' hasta que el asesor lo revisa y aprueba
--      (ahi si se registra el pago y la cuota pasa a pagada).
--
-- Seguridad: el acceso publico es SOLO por RPC SECURITY DEFINER
-- (mismo patron que mapa_publico, 010). Los archivos viven en
-- buckets PRIVADOS: el portal sube con el rol anon (politica de
-- INSERT) pero nadie lee sin sesion; el backoffice usa URLs firmadas.
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ============================================================


-- ============================================================
-- A) DOCUMENTO DEL CONTRATO
-- ============================================================

ALTER TABLE contratos ADD COLUMN IF NOT EXISTS documento_url TEXT;
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS documento_tipo VARCHAR(20);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS documento_nombre VARCHAR(255);
-- 'subido' = alguien anexo un archivo; 'generado' = la app lo construyo
-- con los datos de la venta.
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS documento_origen VARCHAR(20);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS documento_subido_en TIMESTAMPTZ;

COMMENT ON COLUMN contratos.documento_url IS 'Objeto del bucket privado contratos/ con el documento de este contrato';
COMMENT ON COLUMN contratos.documento_tipo IS 'docx | pdf';
COMMENT ON COLUMN contratos.documento_origen IS 'subido | generado';


-- ============================================================
-- B) COMPROBANTES DE PAGO
-- ============================================================

CREATE TABLE IF NOT EXISTS comprobantes (
    id_comprobante BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cobranza INTEGER NOT NULL REFERENCES cobranzas(id_cobranza) ON DELETE CASCADE,
    id_cliente INTEGER NOT NULL REFERENCES cliente(id_cliente) ON DELETE CASCADE,
    -- Duplicado a proposito: es la llave con la que el cliente entra al
    -- portal, y sirve de auditoria aunque el cliente despues cambie de fila.
    cedula VARCHAR(20) NOT NULL,
    monto_pagado DECIMAL(15,2) NOT NULL,
    archivo_url TEXT NOT NULL,
    archivo_tipo VARCHAR(10) NOT NULL,  -- 'imagen' | 'pdf'
    archivo_nombre VARCHAR(255),
    -- pendiente = el cliente ya subio, falta revision del asesor
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en TIMESTAMPTZ DEFAULT now(),
    revisado_en TIMESTAMPTZ,
    id_revisado_por INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    nota_rechazo TEXT
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comprobantes_estado') THEN
        ALTER TABLE comprobantes ADD CONSTRAINT chk_comprobantes_estado
            CHECK (estado IN ('pendiente','aprobado','rechazado'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comprobantes_tipo') THEN
        ALTER TABLE comprobantes ADD CONSTRAINT chk_comprobantes_tipo
            CHECK (archivo_tipo IN ('imagen','pdf'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comprobantes_monto') THEN
        ALTER TABLE comprobantes ADD CONSTRAINT chk_comprobantes_monto
            CHECK (monto_pagado > 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comprobantes_cobranza ON comprobantes(id_cobranza);
CREATE INDEX IF NOT EXISTS idx_comprobantes_cliente ON comprobantes(id_cliente);
CREATE INDEX IF NOT EXISTS idx_comprobantes_estado ON comprobantes(estado);
CREATE INDEX IF NOT EXISTS idx_comprobantes_cedula ON comprobantes(cedula);


-- ============================================================
-- C) AVISOS DE CUOTAS (idempotencia del cron)
-- ============================================================
-- Sin esto, el cron diario mandaria el mismo correo todos los dias.
-- El UNIQUE garantiza un aviso por cuota y tipo.

CREATE TABLE IF NOT EXISTS aviso_cuota (
    id_aviso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_cobranza INTEGER NOT NULL REFERENCES cobranzas(id_cobranza) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,   -- 'por_vencer' | 'vencida'
    creado_en TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_aviso_cuota UNIQUE (id_cobranza, tipo)
);


-- ============================================================
-- D) BUCKETS PRIVADOS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'comprobantes', 'comprobantes', false, 10485760,
    ARRAY['image/png','image/jpeg','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'contratos', 'contratos', false, 10485760,
    ARRAY['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- El portal (anon) solo SUBE, y unicamente a la carpeta de su cuota: nadie
-- puede listar ni leer el bucket sin sesion.
DROP POLICY IF EXISTS comprobantes_insert_anon ON storage.objects;
CREATE POLICY comprobantes_insert_anon ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (
        bucket_id = 'comprobantes'
        AND (storage.foldername(name))[1] LIKE 'cobranza-%'
    );

DROP POLICY IF EXISTS comprobantes_insert_auth ON storage.objects;
CREATE POLICY comprobantes_insert_auth ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS comprobantes_select_auth ON storage.objects;
CREATE POLICY comprobantes_select_auth ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS comprobantes_delete_auth ON storage.objects;
CREATE POLICY comprobantes_delete_auth ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS contratos_insert_auth ON storage.objects;
CREATE POLICY contratos_insert_auth ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'contratos');

DROP POLICY IF EXISTS contratos_select_auth ON storage.objects;
CREATE POLICY contratos_select_auth ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'contratos');

DROP POLICY IF EXISTS contratos_delete_auth ON storage.objects;
CREATE POLICY contratos_delete_auth ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'contratos');


-- ============================================================
-- E) RPC PUBLICA: consultar mis cuotas con la cedula
-- ============================================================
-- La unica puerta de lectura del portal anon. No devuelve password ni
-- nada de otra empresa: solo las cuotas de quien presenta la cedula.

CREATE OR REPLACE FUNCTION public.portal_cliente_por_cedula(p_cedula TEXT)
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'existe', EXISTS (SELECT 1 FROM cliente cl WHERE trim(cl.cedula_ruc) = trim(p_cedula)),
    'clientes', COALESCE((
      SELECT json_agg(json_build_object(
        'id_cliente', cl.id_cliente,
        'nombres', cl.nombres,
        'email', cl.email,
        'telefono', cl.telefono,
        'contratos', COALESCE((
          SELECT json_agg(json_build_object(
            'id_contrato', ct.id_contrato,
            'numero_contrato', ct.numero_contrato,
            'monto_total', ct.monto_total,
            'fecha', ct.created_at,
            'lote', (
              SELECT COALESCE(NULLIF(mb.nombre_codigo, '') || ' - Lote ' || l.numero_lote, l.numero_lote::text)
              FROM ventas v2
              JOIN lotes l ON l.id_lote = v2.id_lote
              LEFT JOIN manzana_bloque mb ON mb.id_manzana = l.id_manzana
              WHERE v2.id_venta = ct.id_venta
            ),
            'proyecto', (
              SELECT pj.nombre
              FROM ventas v3
              JOIN lotes l3 ON l3.id_lote = v3.id_lote
              JOIN manzana_bloque mb3 ON mb3.id_manzana = l3.id_manzana
              JOIN etapas e ON e.id_etapa = mb3.id_etapa
              JOIN proyectos pj ON pj.id_proyecto = e.id_proyecto
              WHERE v3.id_venta = ct.id_venta
            ),
            'cuotas', COALESCE((
              SELECT json_agg(json_build_object(
                'id_cobranza', cb.id_cobranza,
                'numero_cuota', cb.numero_cuota,
                'monto_cuota', cb.monto_cuota,
                'fecha_vencimiento', cb.fecha_vencimiento,
                'estado', cb.estado,
                'comprobante', (
                  SELECT json_build_object(
                    'estado', cp.estado,
                    'monto_pagado', cp.monto_pagado,
                    'fecha', cp.creado_en,
                    'nota', cp.nota_rechazo
                  )
                  FROM comprobantes cp
                  WHERE cp.id_cobranza = cb.id_cobranza
                  ORDER BY cp.creado_en DESC
                  LIMIT 1
                )
              ) ORDER BY cb.numero_cuota)
              FROM cobranzas cb
              WHERE cb.id_contrato = ct.id_contrato
            ), '[]'::json)
          ) ORDER BY ct.created_at DESC)
          FROM contratos ct
          JOIN ventas v ON v.id_venta = ct.id_venta
          WHERE v.id_cliente = cl.id_cliente
        ), '[]'::json)
      ) FROM cliente cl
      WHERE trim(cl.cedula_ruc) = trim(p_cedula)
      ORDER BY cl.id_cliente
    ), '[]'::json)
  );
$$;

REVOKE ALL ON FUNCTION public.portal_cliente_por_cedula(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_cliente_por_cedula(TEXT) TO anon, authenticated;


-- ============================================================
-- F) RPC PUBLICA: registrar un comprobante
-- ============================================================
-- Devuelve JSON con ok/error en vez de lanzar: el portal anon prefiere
-- mostrar el mensaje de la base que un error de red opaco. Valida que la
-- cuota le pertenezca al dueño de la cedula (nada de ids a mano).

CREATE OR REPLACE FUNCTION public.portal_registrar_comprobante(
    p_cedula TEXT,
    p_id_cobranza INTEGER,
    p_monto NUMERIC,
    p_archivo_url TEXT,
    p_archivo_tipo VARCHAR(10),
    p_archivo_nombre VARCHAR(255) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_cliente INTEGER;
    v_cobranza cobranzas%ROWTYPE;
BEGIN
    SELECT cl.id_cliente INTO v_id_cliente
      FROM cliente cl
     WHERE trim(cl.cedula_ruc) = trim(p_cedula)
     ORDER BY cl.id_cliente
     LIMIT 1;

    IF v_id_cliente IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'No encontramos ninguna cuenta con esa cedula');
    END IF;
    IF p_monto IS NULL OR p_monto <= 0 THEN
        RETURN json_build_object('ok', false, 'error', 'El monto pagado debe ser mayor a cero');
    END IF;
    IF p_archivo_url IS NULL OR btrim(p_archivo_url) = '' THEN
        RETURN json_build_object('ok', false, 'error', 'Falta el archivo del comprobante');
    END IF;
    IF p_archivo_tipo NOT IN ('imagen','pdf') THEN
        RETURN json_build_object('ok', false, 'error', 'Solo se aceptan imagenes o PDF');
    END IF;

    SELECT cb.* INTO v_cobranza
      FROM cobranzas cb
     WHERE cb.id_cobranza = p_id_cobranza
       AND EXISTS (
            SELECT 1 FROM contratos ct
            JOIN ventas v ON v.id_venta = ct.id_venta
            WHERE ct.id_contrato = cb.id_contrato AND v.id_cliente = v_id_cliente
       );

    IF NOT FOUND THEN
        RETURN json_build_object('ok', false, 'error', 'Esa cuota no pertenece a tu cuenta');
    END IF;
    IF v_cobranza.estado = 'pagada' THEN
        RETURN json_build_object('ok', false, 'error', 'Esa cuota ya figura como pagada');
    END IF;

    INSERT INTO comprobantes (id_cobranza, id_cliente, cedula, monto_pagado, archivo_url, archivo_tipo, archivo_nombre)
    VALUES (p_id_cobranza, v_id_cliente, trim(p_cedula), p_monto, btrim(p_archivo_url), p_archivo_tipo, p_archivo_nombre);

    RETURN json_build_object('ok', true, 'estado', 'pendiente');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_registrar_comprobante(TEXT, INTEGER, NUMERIC, TEXT, VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_registrar_comprobante(TEXT, INTEGER, NUMERIC, TEXT, VARCHAR, VARCHAR) TO anon, authenticated;


-- ============================================================
-- G) RPC PUBLICA: subir un documento de contrato (anon? no)
-- ============================================================
-- El backoffice esta autenticado, asi que ahi no hace falta RPC: se
-- actualiza la fila directo. Esta funcion NO existe a proposito.
