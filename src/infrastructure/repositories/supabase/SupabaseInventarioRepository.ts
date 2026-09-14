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
}
