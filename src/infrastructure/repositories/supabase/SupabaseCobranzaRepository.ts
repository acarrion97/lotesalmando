import { supabase } from "@/infrastructure/supabase/client";
import type { Cobranza, CobranzaEstado } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import { getContratoIdsForEmpresa } from "./shared/empresaScope";

// PostgREST corta cada respuesta en 1000 filas; cobranzas supera ese tope
// (una fila por cuota), asi que se lee por paginas con un orden estable.
const PAGE_SIZE = 1000;

export class SupabaseCobranzaRepository implements CobranzaRepository {
  private async fetchAllPages(contratoIds?: number[]): Promise<Cobranza[]> {
    const all: Cobranza[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase.from("cobranzas").select("*").order("id_cobranza");
      if (contratoIds) query = query.in("id_contrato", contratoIds);
      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      const page = (data ?? []) as Cobranza[];
      all.push(...page);
      if (page.length < PAGE_SIZE) break;
    }
    return all;
  }

  async getAll(): Promise<Cobranza[]> {
    return this.fetchAllPages();
  }

  async getByEmpresaId(empresaId: number): Promise<Cobranza[]> {
    const contratoIds = await getContratoIdsForEmpresa(empresaId);
    if (contratoIds.length === 0) return [];
    return this.fetchAllPages(contratoIds);
  }

  async getByContratoId(contratoId: number): Promise<Cobranza[]> {
    const { data, error } = await supabase.from("cobranzas").select("*").eq("id_contrato", contratoId);
    if (error) throw error;
    return (data ?? []) as Cobranza[];
  }

  async getById(id: number): Promise<Cobranza | null> {
    const { data, error } = await supabase.from("cobranzas").select("*").eq("id_cobranza", id).single();
    if (error) return null;
    return data as Cobranza;
  }

  async create(data: Omit<Cobranza, "id_cobranza">): Promise<Cobranza> {
    const { data: created, error } = await supabase.from("cobranzas").insert(data).select().single();
    if (error) throw error;
    return created as Cobranza;
  }

  async updateEstado(id: number, estado: CobranzaEstado): Promise<Cobranza> {
    const { data: updated, error } = await supabase.from("cobranzas").update({ estado }).eq("id_cobranza", id).select().single();
    if (error) throw error;
    return updated as Cobranza;
  }

  async getVencidas(): Promise<Cobranza[]> {
    const { data, error } = await supabase.from("cobranzas").select("*").eq("estado", "vencida");
    if (error) throw error;
    return (data ?? []) as Cobranza[];
  }
}
