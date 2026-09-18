import { supabase } from "@/infrastructure/supabase/client";
import type { Lote, LoteEstado } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import { getLoteIdsForEmpresa } from "./shared/empresaScope";

export class SupabaseLotRepository implements LotRepository {
  async getAll(): Promise<Lote[]> {
    const { data, error } = await supabase.from("lotes").select("*");
    if (error) throw error;
    return (data ?? []) as Lote[];
  }

  async getByEmpresaId(empresaId: number): Promise<Lote[]> {
    const loteIds = await getLoteIdsForEmpresa(empresaId);
    if (loteIds.length === 0) return [];
    const { data, error } = await supabase.from("lotes").select("*").in("id_lote", loteIds);
    if (error) throw error;
    return (data ?? []) as Lote[];
  }

  async getByManzanaId(manzanaId: number): Promise<Lote[]> {
    const { data, error } = await supabase.from("lotes").select("*").eq("id_manzana", manzanaId);
    if (error) throw error;
    return (data ?? []) as Lote[];
  }

  async getAvailableByManzanaId(manzanaId: number): Promise<Lote[]> {
    const { data, error } = await supabase.from("lotes").select("*").eq("id_manzana", manzanaId).eq("estado", "disponible");
    if (error) throw error;
    return (data ?? []) as Lote[];
  }

  async getById(id: number): Promise<Lote | null> {
    const { data, error } = await supabase.from("lotes").select("*").eq("id_lote", id).single();
    if (error) return null;
    return data as Lote;
  }

  async create(data: Omit<Lote, "id_lote">): Promise<Lote> {
    const { data: created, error } = await supabase.from("lotes").insert(data).select().single();
    if (error) throw error;
    return created as Lote;
  }

  async update(id: number, data: Partial<Lote>): Promise<Lote> {
    const { data: updated, error } = await supabase.from("lotes").update(data).eq("id_lote", id).select().single();
    if (error) throw error;
    return updated as Lote;
  }

  async updateEstado(id: number, estado: LoteEstado): Promise<Lote> {
    const { data: updated, error } = await supabase.from("lotes").update({ estado }).eq("id_lote", id).select().single();
    if (error) throw error;
    return updated as Lote;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("lotes").delete().eq("id_lote", id);
    if (error) throw error;
  }
}
