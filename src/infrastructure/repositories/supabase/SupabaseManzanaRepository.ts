import { supabase } from "@/infrastructure/supabase/client";
import type { Manzana } from "@/domain/manzana/entities";
import type { ManzanaRepository } from "@/domain/manzana/repositories";

export class SupabaseManzanaRepository implements ManzanaRepository {
  async getAll(): Promise<Manzana[]> {
    const { data, error } = await supabase.from("manzana_bloque").select("*");
    if (error) throw error;
    return (data ?? []) as Manzana[];
  }

  async getByEmpresaId(empresaId: number): Promise<Manzana[]> {
    const { data, error } = await supabase
      .from("manzana_bloque")
      .select("*, etapas!inner(id_proyecto, proyectos!inner(id_empresa))")
      .eq("etapas.proyectos.id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as unknown as Manzana[];
  }

  async getByEtapaId(etapaId: number): Promise<Manzana[]> {
    const { data, error } = await supabase.from("manzana_bloque").select("*").eq("id_etapa", etapaId);
    if (error) throw error;
    return (data ?? []) as Manzana[];
  }

  async getById(id: number): Promise<Manzana | null> {
    const { data, error } = await supabase.from("manzana_bloque").select("*").eq("id_manzana", id).single();
    if (error) return null;
    return data as Manzana;
  }

  async create(data: Omit<Manzana, "id_manzana">): Promise<Manzana> {
    const { data: created, error } = await supabase.from("manzana_bloque").insert(data).select().single();
    if (error) throw error;
    return created as Manzana;
  }

  async update(id: number, data: Partial<Manzana>): Promise<Manzana> {
    const { data: updated, error } = await supabase.from("manzana_bloque").update(data).eq("id_manzana", id).select().single();
    if (error) throw error;
    return updated as Manzana;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("manzana_bloque").delete().eq("id_manzana", id);
    if (error) throw error;
  }
}
