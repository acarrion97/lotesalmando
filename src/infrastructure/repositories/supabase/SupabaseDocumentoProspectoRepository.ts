import { supabase } from "@/infrastructure/supabase/client";
import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import type {
  DocumentoProspectoRepository,
  RevisionDocumentoProspecto,
} from "@/domain/portalProspecto/repositories";

/**
 * Documentación para revisar en el backoffice. La lectura/escritura va
 * directo por PostgREST como `authenticated`: la RLS de
 * `prospecto_documento` (migración 044) acota todo a la empresa de la
 * sesión. El portal anónimo no pasa por acá.
 */
export class SupabaseDocumentoProspectoRepository implements DocumentoProspectoRepository {
  async getByEmpresaId(empresaId: number): Promise<DocumentoProspecto[]> {
    const { data, error } = await supabase
      .from("prospecto_documento")
      .select("*, prospectos(nombres, email, telefono)")
      .eq("id_empresa", empresaId)
      .order("creado_en", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as DocumentoProspecto[];
  }

  async getById(id: number): Promise<DocumentoProspecto | null> {
    const { data, error } = await supabase
      .from("prospecto_documento")
      .select("*, prospectos(nombres, email, telefono)")
      .eq("id_documento", id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as DocumentoProspecto) ?? null;
  }

  async revisar(
    id: number,
    revision: RevisionDocumentoProspecto,
    idUsuario: number,
  ): Promise<DocumentoProspecto> {
    const { data, error } = await supabase
      .from("prospecto_documento")
      .update({
        estado: revision.estado,
        nota_revision: revision.estado === "rechazado" ? (revision.nota_revision ?? null) : null,
        id_revisado_por: idUsuario,
        revisado_en: new Date().toISOString(),
      })
      .eq("id_documento", id)
      .select("*, prospectos(nombres, email, telefono)")
      .single();
    if (error) throw error;
    return data as unknown as DocumentoProspecto;
  }
}
