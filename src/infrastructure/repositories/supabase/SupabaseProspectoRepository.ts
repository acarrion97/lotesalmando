import { supabase } from "@/infrastructure/supabase/client";
import type { Prospecto } from "@/domain/prospecto/entities";
import type { ProspectoRepository } from "@/domain/prospecto/repositories";

export class SupabaseProspectoRepository implements ProspectoRepository {
  async getAll(): Promise<Prospecto[]> {
    const { data, error } = await supabase.from("prospectos").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Prospecto[];
  }

  async getByEmpresaId(empresaId: number): Promise<Prospecto[]> {
    const { data, error } = await supabase.from("prospectos").select("*").eq("id_empresa", empresaId).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Prospecto[];
  }

  async getById(id: number): Promise<Prospecto | null> {
    const { data, error } = await supabase.from("prospectos").select("*").eq("id_prospecto", id).single();
    if (error) return null;
    return data as Prospecto;
  }

  async create(data: Omit<Prospecto, "id_prospecto" | "created_at">): Promise<Prospecto> {
    const { data: created, error } = await supabase.from("prospectos").insert(data).select().single();
    if (error) throw error;
    return created as Prospecto;
  }

  async update(id: number, data: Partial<Prospecto>): Promise<Prospecto> {
    const { data: updated, error } = await supabase.from("prospectos").update({ ...data, updated_at: new Date().toISOString() }).eq("id_prospecto", id).select().single();
    if (error) throw error;
    return updated as Prospecto;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("prospectos").delete().eq("id_prospecto", id);
    if (error) throw error;
  }
}
