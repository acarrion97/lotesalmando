import { supabase } from "@/infrastructure/supabase/client";
import type { Cobranza, CobranzaEstado } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";

export class SupabaseCobranzaRepository implements CobranzaRepository {
  async getAll(): Promise<Cobranza[]> {
    const { data, error } = await supabase.from("cobranzas").select("*");
    if (error) throw error;
    return (data ?? []) as Cobranza[];
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
}
