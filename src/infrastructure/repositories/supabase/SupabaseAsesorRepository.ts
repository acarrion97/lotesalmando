import { supabase } from "@/infrastructure/supabase/client";
import type { Asesor } from "@/domain/asesor/entities";
import type { AsesorRepository } from "@/domain/asesor/repositories";

export class SupabaseAsesorRepository implements AsesorRepository {
  async getAll(): Promise<Asesor[]> {
    const { data, error } = await supabase.from("asesores").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Asesor[];
  }

  async getByEmpresaId(empresaId: number): Promise<Asesor[]> {
    const { data, error } = await supabase.from("asesores").select("*").eq("id_empresa", empresaId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Asesor[];
  }

  async getById(id: number): Promise<Asesor | null> {
    const { data, error } = await supabase.from("asesores").select("*").eq("id_asesor", id).single();
    if (error) return null;
    return data as Asesor;
  }

  async create(data: Omit<Asesor, "id_asesor" | "created_at">): Promise<Asesor> {
    const { data: created, error } = await supabase.from("asesores").insert(data).select().single();
    if (error) throw error;
    return created as Asesor;
  }

  async update(id: number, data: Partial<Asesor>): Promise<Asesor> {
    const { data: updated, error } = await supabase.from("asesores").update(data).eq("id_asesor", id).select().single();
    if (error) throw error;
    return updated as Asesor;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("asesores").delete().eq("id_asesor", id);
    if (error) throw error;
  }
}
