import { supabase } from "@/infrastructure/supabase/client";
import type {
  PortalProspecto,
  PortalProspectoDatos,
  PortalDocumento,
} from "@/domain/portalProspecto/entities";
import type {
  IniciarProspectoInput,
  PortalProspectoRepository,
  RegistrarDocumentoInput,
  ResultadoPortal,
} from "@/domain/portalProspecto/repositories";

/** Shape crudo que devuelven las RPC del portal (migración 044). */
interface CrudoConsulta {
  ok?: boolean;
  error?: string;
  prospecto: {
    id_prospecto: number;
    nombres: string;
    email: string | null;
    telefono: string | null;
    estado: string | null;
  } | null;
  documentos?: Array<{
    tipo: string;
    estado: string;
    archivo_nombre: string | null;
    nota_revision: string | null;
    creado_en: string | null;
    revisado_en: string | null;
  }>;
}

interface CrudoResultado {
  ok?: boolean;
  error?: string;
  id_prospecto?: number;
  existe?: boolean;
}

/**
 * Puerta del portal de prospectos: todo pasa por RPCs SECURITY DEFINER
 * con el rol anon (migración 044). El navegador nunca consulta
 * `prospectos` ni `prospecto_documento` a mano.
 */
export class SupabasePortalProspectoRepository implements PortalProspectoRepository {
  async getByEmail(slug: string, email: string): Promise<PortalProspectoDatos> {
    const { data, error } = await supabase.rpc("portal_prospecto_por_email", {
      p_slug: slug,
      p_email: email,
    });
    if (error) throw error;
    const crudo = (data ?? {}) as CrudoConsulta;

    if (!crudo.ok) {
      return {
        ok: false,
        error: crudo.error ?? "No se pudo consultar tu documentación",
        prospecto: null,
        documentos: [],
      };
    }

    const prospecto: PortalProspecto | null = crudo.prospecto
      ? {
          id_prospecto: crudo.prospecto.id_prospecto,
          nombres: crudo.prospecto.nombres,
          email: crudo.prospecto.email,
          telefono: crudo.prospecto.telefono,
          estado: crudo.prospecto.estado,
        }
      : null;

    const documentos: PortalDocumento[] = (crudo.documentos ?? []).map((doc) => ({
      tipo: doc.tipo as PortalDocumento["tipo"],
      estado: doc.estado as PortalDocumento["estado"],
      archivo_nombre: doc.archivo_nombre,
      nota_revision: doc.nota_revision,
      creado_en: doc.creado_en,
      revisado_en: doc.revisado_en,
    }));

    return { ok: true, prospecto, documentos };
  }

  async iniciarProspecto(input: IniciarProspectoInput): Promise<ResultadoPortal> {
    const { data, error } = await supabase.rpc("portal_iniciar_prospecto", {
      p_slug: input.slug,
      p_email: input.email,
      p_nombres: input.nombres,
      p_telefono: input.telefono,
    });
    if (error) return { ok: false, error: error.message };
    const crudo = (data ?? {}) as CrudoResultado;
    return {
      ok: !!crudo.ok,
      error: crudo.error,
      id_prospecto: crudo.id_prospecto,
      existe: crudo.existe,
    };
  }

  async registrarDocumento(input: RegistrarDocumentoInput): Promise<ResultadoPortal> {
    const { data, error } = await supabase.rpc("portal_registrar_documento", {
      p_email: input.email,
      p_id_prospecto: input.idProspecto,
      p_tipo: input.tipo,
      p_path: input.path,
      p_nombre: input.nombre,
    });
    if (error) return { ok: false, error: error.message };
    const crudo = (data ?? {}) as CrudoResultado;
    return { ok: !!crudo.ok, error: crudo.error };
  }
}
