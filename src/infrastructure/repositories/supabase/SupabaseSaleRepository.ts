import { supabase } from "@/infrastructure/supabase/client";
import type { Venta } from "@/domain/venta/entities";
import type { SaleRepository } from "@/domain/venta/repositories";
import { getLoteIdsForEmpresa, leerPorIds } from "./shared/empresaScope";

export class SupabaseSaleRepository implements SaleRepository {
  async getAll(): Promise<Venta[]> {
    const { data, error } = await supabase.from("ventas").select("*");
    if (error) throw error;
    return (data ?? []) as Venta[];
  }

  async getByEmpresaId(empresaId: number): Promise<Venta[]> {
    const loteIds = await getLoteIdsForEmpresa(empresaId);
    if (loteIds.length === 0) return [];
    const filas = await leerPorIds("ventas", "id_lote", loteIds);
    return filas as unknown as Venta[];
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
