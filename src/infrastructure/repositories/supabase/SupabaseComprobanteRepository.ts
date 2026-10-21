import { supabase } from "@/infrastructure/supabase/client";
import {
  getCobranzaIdsForEmpresa,
  leerPorIds,
} from "@/infrastructure/repositories/supabase/shared/empresaScope";
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
    // Las cobranzas de una empresa son 24 cuotas por contrato: la lista ya
    // pasa de los 1000 ids que entra en un solo `.in()`, así que los ids
    // viajan en bloques y la respuesta se pagina. Antes la lista se cortaba
    // en los primeros 1000 ids y los comprobantes de las cuotas "lejanas"
    // no aparecían en Clientes → Deudas ni en Cobranzas.
    const cobranzaIds = await getCobranzaIdsForEmpresa(empresaId);
    if (cobranzaIds.length === 0) return [];
    const filas = await leerPorIds("comprobantes", "id_cobranza", cobranzaIds, {
      orden: "id_comprobante",
      ascendente: false,
    });
    // Los bloques llegan por separado: se ordena al final para conservar
    // el "más reciente primero" que esperan Clientes → Deudas y Cobranzas.
    return (filas as unknown as Comprobante[]).sort((a, b) =>
      (b.creado_en ?? "").localeCompare(a.creado_en ?? ""),
    );
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
