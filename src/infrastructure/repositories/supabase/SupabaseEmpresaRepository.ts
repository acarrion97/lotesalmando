import { supabase } from "@/infrastructure/supabase/client";
import type { Empresa } from "@/domain/empresa/entities";
import type { EmpresaRepository } from "@/domain/empresa/repositories";

export class SupabaseEmpresaRepository implements EmpresaRepository {
  async getAll(): Promise<Empresa[]> {
    const { data, error } = await supabase.from("empresa").select("*");
    if (error) throw error;
    return (data ?? []) as Empresa[];
  }

  async getById(id: number): Promise<Empresa | null> {
    const { data, error } = await supabase.from("empresa").select("*").eq("id_empresa", id).single();
    if (error) return null;
    return data as Empresa;
  }

  async create(data: Omit<Empresa, "id_empresa">): Promise<Empresa> {
    const { data: created, error } = await supabase.from("empresa").insert(data).select().single();
    if (error) throw error;
    return created as Empresa;
  }

  async update(id: number, data: Partial<Empresa>): Promise<Empresa> {
    const { data: updated, error } = await supabase.from("empresa").update(data).eq("id_empresa", id).select().single();
    if (error) throw error;
    return updated as Empresa;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("empresa").delete().eq("id_empresa", id);
    if (error) throw error;
  }
}
