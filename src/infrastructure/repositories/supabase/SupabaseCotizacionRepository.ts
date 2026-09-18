import { supabase } from "@/infrastructure/supabase/client";
import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";

export class SupabaseCotizacionRepository implements CotizacionRepository {
  async getAll(): Promise<Cotizacion[]> {
    const { data, error } = await supabase.from("cotizador").select("*");
    if (error) throw error;
    return (data ?? []) as Cotizacion[];
  }

  async getByEmpresaId(empresaId: number): Promise<Cotizacion[]> {
    const { data, error } = await supabase
      .from("cotizador")
      .select("*, lotes!inner(manzana_bloque!inner(etapas!inner(proyectos!inner(id_empresa))))")
      .eq("lotes.manzana_bloque.etapas.proyectos.id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as unknown as Cotizacion[];
  }

  async getById(id: number): Promise<Cotizacion | null> {
    const { data, error } = await supabase.from("cotizador").select("*").eq("id_cotizacion", id).single();
    if (error) return null;
    return data as Cotizacion;
  }

  async create(data: Omit<Cotizacion, "id_cotizacion">): Promise<Cotizacion> {
    const { data: created, error } = await supabase.from("cotizador").insert(data).select().single();
    if (error) throw error;
    return created as Cotizacion;
  }

  async update(id: number, data: Partial<Cotizacion>): Promise<Cotizacion> {
    const { data: updated, error } = await supabase.from("cotizador").update(data).eq("id_cotizacion", id).select().single();
    if (error) throw error;
    return updated as Cotizacion;
  }
}
