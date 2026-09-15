import { supabase } from "@/infrastructure/supabase/client";
import type { Oportunidad } from "@/domain/oportunidad/entities";
import type { OportunidadRepository } from "@/domain/oportunidad/repositories";

export class SupabaseOportunidadRepository implements OportunidadRepository {
  async getAll(): Promise<Oportunidad[]> {
    const { data, error } = await supabase.from("oportunidades").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Oportunidad[];
  }

  async getByProspectoId(prospectoId: number): Promise<Oportunidad[]> {
    const { data, error } = await supabase.from("oportunidades").select("*").eq("id_prospecto", prospectoId);
    if (error) throw error;
    return (data ?? []) as Oportunidad[];
  }

  async getById(id: number): Promise<Oportunidad | null> {
    const { data, error } = await supabase.from("oportunidades").select("*").eq("id_oportunidad", id).single();
    if (error) return null;
    return data as Oportunidad;
  }

  async create(data: Omit<Oportunidad, "id_oportunidad" | "created_at">): Promise<Oportunidad> {
    const { data: created, error } = await supabase.from("oportunidades").insert(data).select().single();
    if (error) throw error;
    return created as Oportunidad;
  }

  async update(id: number, data: Partial<Oportunidad>): Promise<Oportunidad> {
    const { data: updated, error } = await supabase.from("oportunidades").update({ ...data, updated_at: new Date().toISOString() }).eq("id_oportunidad", id).select().single();
    if (error) throw error;
    return updated as Oportunidad;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("oportunidades").delete().eq("id_oportunidad", id);
    if (error) throw error;
  }
}
