import { supabase } from "@/infrastructure/supabase/client";
import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";

export class SupabaseProyectoRepository implements ProyectoRepository {
  async getAll(): Promise<Proyecto[]> {
    const { data, error } = await supabase.from("proyectos").select("*");
    if (error) throw error;
    return (data ?? []) as Proyecto[];
  }

  async getByEmpresaId(empresaId: number): Promise<Proyecto[]> {
    const { data, error } = await supabase.from("proyectos").select("*").eq("id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as Proyecto[];
  }

  async getById(id: number): Promise<Proyecto | null> {
    const { data, error } = await supabase.from("proyectos").select("*").eq("id_proyecto", id).single();
    if (error) return null;
    return data as Proyecto;
  }

  async create(data: Omit<Proyecto, "id_proyecto">): Promise<Proyecto> {
    const { data: created, error } = await supabase.from("proyectos").insert(data).select().single();
    if (error) throw error;
    return created as Proyecto;
  }

  async update(id: number, data: Partial<Proyecto>): Promise<Proyecto> {
    const { data: updated, error } = await supabase.from("proyectos").update(data).eq("id_proyecto", id).select().single();
    if (error) throw error;
    return updated as Proyecto;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("proyectos").delete().eq("id_proyecto", id);
    if (error) throw error;
  }
}
