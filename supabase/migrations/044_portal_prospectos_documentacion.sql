-- ============================================================
-- 044: PORTAL DE PROSPECTOS - DOCUMENTACION PARA LA VENTA
-- ============================================================
-- El prospecto envia desde /portal-prospecto/:slug, identificandose
-- con su email, la documentacion legal necesaria para concretar la
-- venta de un lote (cedula, comprobante de domicilio, acta/RUC,
-- comprobante de ingresos). Queda en estado 'pendiente' hasta que el
-- asesor la revisa y aprueba o rechaza.
--
-- Seguridad: mismo patron que el portal de clientes (035) y el mapa
-- publico (018): el acceso publico es SOLO por RPC SECURITY DEFINER
-- con rol `anon`; los archivos viven en un bucket PRIVADO y el anon
-- unicamente SUBE a la carpeta de su propio prospecto. La tabla
-- `prospecto_documento` lleva RLS: sin policy para anon, con policy
-- por empresa para el backoffice autenticado.
--
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- ============================================================


-- ============================================================
-- A) DOCUMENTOS DEL PROSPECTO
-- ============================================================
-- Un documento por tipo (UNIQUE): el reenvio sobrescribe el archivo
-- y vuelve a 'pendiente' (el portal no versiona historicos).

CREATE TABLE IF NOT EXISTS prospecto_documento (
    id_documento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_prospecto INTEGER NOT NULL REFERENCES prospectos(id_prospecto) ON DELETE CASCADE,
    id_empresa INTEGER NOT NULL REFERENCES empresa(id_empresa) ON DELETE CASCADE,
    -- Clave del portal: cedula | comprobante_domicilio |
    -- constitucion | comprobante_ingresos (misma lista que valida la RPC).
    tipo VARCHAR(40) NOT NULL,
    archivo_path TEXT NOT NULL,
    archivo_nombre VARCHAR(255),
    -- pendiente = el prospecto ya subio, falta revision del asesor
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    creado_en TIMESTAMPTZ DEFAULT now(),
    revisado_en TIMESTAMPTZ,
    id_revisado_por INTEGER REFERENCES usuario(id_usuario) ON DELETE SET NULL,
    nota_revision TEXT,
    CONSTRAINT uq_prospecto_documento_tipo UNIQUE (id_prospecto, tipo)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prospecto_documento_estado') THEN
        ALTER TABLE prospecto_documento ADD CONSTRAINT chk_prospecto_documento_estado
            CHECK (estado IN ('pendiente','aprobado','rechazado'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_prospecto_documento_tipo') THEN
        ALTER TABLE prospecto_documento ADD CONSTRAINT chk_prospecto_documento_tipo
            CHECK (tipo IN ('cedula','comprobante_domicilio','constitucion','comprobante_ingresos'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prospecto_documento_empresa ON prospecto_documento(id_empresa, estado);
CREATE INDEX IF NOT EXISTS idx_prospecto_documento_prospecto ON prospecto_documento(id_prospecto);

-- RLS: el backoffice (authenticated) opera por empresa; el anon no
-- tiene policy, asi que solo puede tocar la tabla via las RPCs
-- SECURITY DEFINER de mas abajo (que corren como su propietario).
ALTER TABLE prospecto_documento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prospecto_documento_empresa ON prospecto_documento;
CREATE POLICY prospecto_documento_empresa ON prospecto_documento
    FOR ALL TO authenticated
    USING (id_empresa = public.current_empresa_id())
    WITH CHECK (id_empresa = public.current_empresa_id());

REVOKE ALL ON TABLE prospecto_documento FROM anon;


-- ============================================================
-- B) IDEMPOTENCIA DEL AVISO AL ASESOR
-- ============================================================
-- Sin esto, cada archivo subido dispararia un correo: el UNIQUE
-- garantiza maximo un aviso por prospecto por dia (patron aviso_cuota).

CREATE TABLE IF NOT EXISTS aviso_documento_prospecto (
    id_aviso BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_prospecto INTEGER NOT NULL REFERENCES prospectos(id_prospecto) ON DELETE CASCADE,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    creado_en TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_aviso_documento_prospecto UNIQUE (id_prospecto, fecha)
);

-- Solo el service_role del endpoint la toca (patron 031).
ALTER TABLE aviso_documento_prospecto ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE aviso_documento_prospecto FROM anon, authenticated;


-- ============================================================
-- C) BUCKET PRIVADO DE DOCUMENTOS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documentos_prospectos', 'documentos_prospectos', false, 10485760,
    ARRAY['image/png','image/jpeg','image/webp','application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- El portal (anon) solo SUBE, y unicamente a la carpeta de su
-- prospecto: nadie lista ni lee el bucket sin sesion.
DROP POLICY IF EXISTS documentos_prospectos_insert_anon ON storage.objects;
CREATE POLICY documentos_prospectos_insert_anon ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (
        bucket_id = 'documentos_prospectos'
        AND (storage.foldername(name))[1] LIKE 'prospecto-%'
    );

DROP POLICY IF EXISTS documentos_prospectos_insert_auth ON storage.objects;
CREATE POLICY documentos_prospectos_insert_auth ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'documentos_prospectos');

DROP POLICY IF EXISTS documentos_prospectos_select_auth ON storage.objects;
CREATE POLICY documentos_prospectos_select_auth ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'documentos_prospectos');

DROP POLICY IF EXISTS documentos_prospectos_delete_auth ON storage.objects;
CREATE POLICY documentos_prospectos_delete_auth ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'documentos_prospectos');


-- ============================================================
-- D) RPC PUBLICA: consultar mi documentacion por email
-- ============================================================
-- Devuelve el prospecto de la empresa del slug (si existe) y sus
-- documentos. Nunca devuelve archivos de otro email: la pertenencia
-- la decide la propia consulta.

CREATE OR REPLACE FUNCTION public.portal_prospecto_por_email(p_slug TEXT, p_email TEXT)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_empresa INTEGER;
    v_email TEXT := COALESCE(lower(trim(p_email)), '');
    v_prospecto prospectos%ROWTYPE;
BEGIN
    IF v_email = '' OR position('@' IN v_email) = 0 THEN
        RETURN json_build_object('ok', false, 'error', 'Ingrese un email valido');
    END IF;

    -- La empresa se resuelve por el slug publico (igual que 018):
    -- el navegador nunca recibe ni envia id_empresa.
    SELECT p.id_empresa INTO v_id_empresa
      FROM mapas m
      JOIN proyectos p ON p.id_proyecto = m.id_proyecto
     WHERE m.slug IS NOT NULL
       AND lower(m.slug) = lower(COALESCE(p_slug, ''))
     LIMIT 1;

    IF v_id_empresa IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'El portal solicitado no existe');
    END IF;

    SELECT * INTO v_prospecto
      FROM prospectos pr
     WHERE pr.id_empresa = v_id_empresa
       AND lower(trim(pr.email)) = v_email
     ORDER BY pr.id_prospecto
     LIMIT 1;

    RETURN json_build_object(
        'ok', true,
        'prospecto', CASE WHEN v_prospecto.id_prospecto IS NULL THEN NULL ELSE json_build_object(
            'id_prospecto', v_prospecto.id_prospecto,
            'nombres', v_prospecto.nombres,
            'email', v_prospecto.email,
            'telefono', v_prospecto.telefono,
            'estado', v_prospecto.estado
        ) END,
        'documentos', COALESCE((
            SELECT json_agg(json_build_object(
                'tipo', pd.tipo,
                'estado', pd.estado,
                'archivo_nombre', pd.archivo_nombre,
                'nota_revision', pd.nota_revision,
                'creado_en', pd.creado_en,
                'revisado_en', pd.revisado_en
            ) ORDER BY pd.tipo)
            FROM prospecto_documento pd
            WHERE pd.id_prospecto = COALESCE(v_prospecto.id_prospecto, -1)
        ), '[]'::json)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.portal_prospecto_por_email(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_prospecto_por_email(TEXT, TEXT) TO anon, authenticated;


-- ============================================================
-- E) RPC PUBLICA: iniciar (o reutilizar) el prospecto del portal
-- ============================================================
-- Dedupe por email dentro de la empresa: nunca duplica. Si ya existe
-- se reutiliza tal cual (no toca su estado en el pipeline).

CREATE OR REPLACE FUNCTION public.portal_iniciar_prospecto(
    p_slug TEXT,
    p_email TEXT,
    p_nombres TEXT,
    p_telefono TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id_empresa INTEGER;
    v_email TEXT := COALESCE(lower(trim(p_email)), '');
    v_nombres TEXT := COALESCE(trim(p_nombres), '');
    v_telefono TEXT := COALESCE(trim(p_telefono), '');
    v_id_prospecto INTEGER;
    v_existe BOOLEAN := FALSE;
BEGIN
    IF v_email = '' OR position('@' IN v_email) = 0 THEN
        RETURN json_build_object('ok', false, 'error', 'Ingrese un email valido');
    END IF;
    IF length(v_nombres) < 2 THEN
        RETURN json_build_object('ok', false, 'error', 'Ingrese sus nombres');
    END IF;
    IF length(v_telefono) < 5 THEN
        RETURN json_build_object('ok', false, 'error', 'Ingrese un telefono valido');
    END IF;

    SELECT p.id_empresa INTO v_id_empresa
      FROM mapas m
      JOIN proyectos p ON p.id_proyecto = m.id_proyecto
     WHERE m.slug IS NOT NULL
       AND lower(m.slug) = lower(COALESCE(p_slug, ''))
     LIMIT 1;

    IF v_id_empresa IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'El portal solicitado no existe');
    END IF;

    -- Dedupe por email (case-insensitive) dentro de la empresa.
    SELECT pr.id_prospecto INTO v_id_prospecto
      FROM prospectos pr
     WHERE pr.id_empresa = v_id_empresa
       AND lower(trim(pr.email)) = v_email
     ORDER BY pr.id_prospecto
     LIMIT 1;

    IF v_id_prospecto IS NOT NULL THEN
        v_existe := TRUE;
    ELSE
        INSERT INTO prospectos (id_empresa, id_asesor, nombres, email, telefono, origen, estado, notas)
        VALUES (v_id_empresa, NULL, v_nombres, trim(p_email), v_telefono, 'portal', 'nuevo',
                'Registrado desde el portal de documentacion')
        RETURNING id_prospecto INTO v_id_prospecto;
    END IF;

    RETURN json_build_object('ok', true, 'id_prospecto', v_id_prospecto, 'existe', v_existe);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_iniciar_prospecto(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_iniciar_prospecto(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;


-- ============================================================
-- F) RPC PUBLICA: registrar un documento enviado
-- ============================================================
-- Devuelve JSON con ok/error en vez de lanzar (mismo criterio que
-- portal_registrar_comprobante). Valida que el prospecto le
-- pertenezca al dueño del email: nada de ids a mano. El reenvio de
-- un tipo ya registrado sobrescribe el archivo y vuelve a
-- 'pendiente' (limpia la revision anterior).

CREATE OR REPLACE FUNCTION public.portal_registrar_documento(
    p_email TEXT,
    p_id_prospecto INTEGER,
    p_tipo VARCHAR(40),
    p_path TEXT,
    p_nombre VARCHAR(255) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_email TEXT := COALESCE(lower(trim(p_email)), '');
    v_prospecto prospectos%ROWTYPE;
    v_id_documento BIGINT;
BEGIN
    IF v_email = '' OR position('@' IN v_email) = 0 THEN
        RETURN json_build_object('ok', false, 'error', 'Ingrese un email valido');
    END IF;
    IF p_tipo NOT IN ('cedula','comprobante_domicilio','constitucion','comprobante_ingresos') THEN
        RETURN json_build_object('ok', false, 'error', 'Tipo de documento no valido');
    END IF;
    IF p_path IS NULL OR btrim(p_path) = '' THEN
        RETURN json_build_object('ok', false, 'error', 'Falta el archivo del documento');
    END IF;

    -- Pertenencia: el id tiene que corresponder al email presentado.
    SELECT * INTO v_prospecto
      FROM prospectos pr
     WHERE pr.id_prospecto = p_id_prospecto
       AND lower(trim(pr.email)) = v_email
     LIMIT 1;

    IF v_prospecto.id_prospecto IS NULL THEN
        RETURN json_build_object('ok', false, 'error', 'Ese prospecto no pertenece a tu cuenta');
    END IF;

    INSERT INTO prospecto_documento (id_prospecto, id_empresa, tipo, archivo_path, archivo_nombre, estado)
    VALUES (v_prospecto.id_prospecto, v_prospecto.id_empresa, p_tipo,
            btrim(p_path), p_nombre, 'pendiente')
    ON CONFLICT (id_prospecto, tipo) DO UPDATE
        SET archivo_path = EXCLUDED.archivo_path,
            archivo_nombre = EXCLUDED.archivo_nombre,
            estado = 'pendiente',
            creado_en = now(),
            revisado_en = NULL,
            id_revisado_por = NULL,
            nota_revision = NULL
    RETURNING id_documento INTO v_id_documento;

    RETURN json_build_object('ok', true, 'id_documento', v_id_documento, 'estado', 'pendiente');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('ok', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.portal_registrar_documento(TEXT, INTEGER, VARCHAR, TEXT, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_registrar_documento(TEXT, INTEGER, VARCHAR, TEXT, VARCHAR) TO anon, authenticated;


-- ============================================================
-- G) PERMISO DE REVISION EN EL BACKOFFICE
-- ============================================================
-- Convencion 024: revisar_<modulo> se otorga a los roles de
-- supervision. El Administrador lo recibe siempre; aqui se asigna
-- explicito porque el catalogo 024 corrio antes que esta migracion.

INSERT INTO permiso (nombre_permiso, modulo) VALUES
  ('revisar_documentos_prospectos', 'prospectos')
ON CONFLICT (nombre_permiso, modulo) DO NOTHING;

INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso
FROM roles r
CROSS JOIN permiso p
WHERE r.nombre_rol IN ('Administrador', 'Gerente', 'Superusuario')
  AND p.nombre_permiso = 'revisar_documentos_prospectos'
  AND p.modulo = 'prospectos'
ON CONFLICT (id_rol, id_permiso) DO NOTHING;

-- Mantener la secuencia de permisos (patron 025).
SELECT setval(
  pg_get_serial_sequence('permiso', 'id_permiso'),
  COALESCE((SELECT MAX(id_permiso) FROM permiso), 1),
  true
);
