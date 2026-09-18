import { supabase } from "@/infrastructure/supabase/client";
import type { Etapa } from "@/domain/etapa/entities";
import type { EtapaRepository } from "@/domain/etapa/repositories";

export class SupabaseEtapaRepository implements EtapaRepository {
  async getAll(): Promise<Etapa[]> {
    const { data, error } = await supabase.from("etapas").select("*");
    if (error) throw error;
    return (data ?? []) as Etapa[];
  }

  async getByEmpresaId(empresaId: number): Promise<Etapa[]> {
    const { data, error } = await supabase
      .from("etapas")
      .select("*, proyectos!inner(id_empresa)")
      .eq("proyectos.id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as unknown as Etapa[];
  }

  async getByProyectoId(proyectoId: number): Promise<Etapa[]> {
    const { data, error } = await supabase.from("etapas").select("*").eq("id_proyecto", proyectoId);
    if (error) throw error;
    return (data ?? []) as Etapa[];
  }

  async getById(id: number): Promise<Etapa | null> {
    const { data, error } = await supabase.from("etapas").select("*").eq("id_etapa", id).single();
    if (error) return null;
    return data as Etapa;
  }

  async create(data: Omit<Etapa, "id_etapa">): Promise<Etapa> {
    const { data: created, error } = await supabase.from("etapas").insert(data).select().single();
    if (error) throw error;
    return created as Etapa;
  }

  async update(id: number, data: Partial<Etapa>): Promise<Etapa> {
    const { data: updated, error } = await supabase.from("etapas").update(data).eq("id_etapa", id).select().single();
    if (error) throw error;
    return updated as Etapa;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("etapas").delete().eq("id_etapa", id);
    if (error) throw error;
  }
}
