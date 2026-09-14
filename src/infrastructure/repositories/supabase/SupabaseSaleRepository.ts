import { supabase } from "@/infrastructure/supabase/client";
import type { Venta } from "@/domain/venta/entities";
import type { SaleRepository } from "@/domain/venta/repositories";

export class SupabaseSaleRepository implements SaleRepository {
  async getAll(): Promise<Venta[]> {
    const { data, error } = await supabase.from("ventas").select("*");
    if (error) throw error;
    return (data ?? []) as Venta[];
  }

  async getById(id: number): Promise<Venta | null> {
    const { data, error } = await supabase.from("ventas").select("*").eq("id_venta", id).single();
    if (error) return null;
    return data as Venta;
  }

  async create(data: Omit<Venta, "id_venta">): Promise<Venta> {
    const { data: created, error } = await supabase.from("ventas").insert(data).select().single();
    if (error) throw error;
    return created as Venta;
  }

  async update(id: number, data: Partial<Venta>): Promise<Venta> {
    const { data: updated, error } = await supabase.from("ventas").update(data).eq("id_venta", id).select().single();
    if (error) throw error;
    return updated as Venta;
  }
}
