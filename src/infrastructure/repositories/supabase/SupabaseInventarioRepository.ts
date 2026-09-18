import { supabase } from "@/infrastructure/supabase/client";
import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";

export class SupabaseInventarioRepository implements InventarioRepository {
  async getAll(): Promise<Inventario[]> {
    const { data, error } = await supabase.from("inventario").select("*");
    if (error) throw error;
    return (data ?? []) as Inventario[];
  }

  async getByLoteId(loteId: number): Promise<Inventario[]> {
    const { data, error } = await supabase.from("inventario").select("*").eq("id_lote", loteId);
    if (error) throw error;
    return (data ?? []) as Inventario[];
  }

  async create(data: Omit<Inventario, "id_inventario">): Promise<Inventario> {
    const { data: created, error } = await supabase.from("inventario").insert(data).select().single();
    if (error) throw error;
    return created as Inventario;
  }

  async getById(id: number): Promise<Inventario | null> {
    const { data, error } = await supabase
      .from("inventario")
      .select("*")
      .eq("id_inventario", id)
      .single();
    if (error) return null;
    return data as Inventario;
  }

  async update(id: number, data: Partial<Inventario>): Promise<Inventario> {
    const { data: updated, error } = await supabase
      .from("inventario")
      .update(data)
      .eq("id_inventario", id)
      .select()
      .single();
    if (error) throw error;
    return updated as Inventario;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from("inventario")
      .delete()
      .eq("id_inventario", id);
    if (error) throw error;
  }
}
