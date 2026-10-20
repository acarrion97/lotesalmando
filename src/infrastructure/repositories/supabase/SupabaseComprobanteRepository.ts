import { supabase } from "@/infrastructure/supabase/client";
import { getCobranzaIdsForEmpresa } from "@/infrastructure/repositories/supabase/shared/empresaScope";
import type { Comprobante } from "@/domain/comprobante/entities";
import type { ComprobanteRepository, RevisionComprobante } from "@/domain/comprobante/repositories";

export class SupabaseComprobanteRepository implements ComprobanteRepository {
  async getAll(): Promise<Comprobante[]> {
    const { data, error } = await supabase
      .from("comprobantes")
      .select("*")
      .order("creado_en", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Comprobante[];
  }

  async getByEmpresaId(empresaId: number): Promise<Comprobante[]> {
    const cobranzaIds = await getCobranzaIdsForEmpresa(empresaId);
    if (cobranzaIds.length === 0) return [];
    const { data, error } = await supabase
      .from("comprobantes")
      .select("*")
      .in("id_cobranza", cobranzaIds)
      .order("creado_en", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Comprobante[];
  }

  async getByCobranzaId(cobranzaId: number): Promise<Comprobante[]> {
    const { data, error } = await supabase
      .from("comprobantes")
      .select("*")
      .eq("id_cobranza", cobranzaId)
      .order("creado_en", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Comprobante[];
  }

  async getById(id: number): Promise<Comprobante | null> {
    const { data, error } = await supabase
      .from("comprobantes")
      .select("*")
      .eq("id_comprobante", id)
      .single();
    if (error) return null;
    return data as Comprobante;
  }

  async revisar(
    id: number,
    revision: RevisionComprobante,
    idUsuario: number,
  ): Promise<Comprobante> {
    const { data, error } = await supabase
      .from("comprobantes")
      .update({
        estado: revision.estado,
        nota_rechazo: revision.estado === "rechazado" ? revision.nota_rechazo ?? null : null,
        revisado_en: new Date().toISOString(),
        id_revisado_por: idUsuario,
      })
      .eq("id_comprobante", id)
      .select()
      .single();
    if (error) throw error;
    return data as Comprobante;
  }
}
