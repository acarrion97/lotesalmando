import { supabase } from "@/infrastructure/supabase/client";
import type { Pago } from "@/domain/pago/entities";
import type { PagoRepository } from "@/domain/pago/repositories";
import { getCobranzaIdsForEmpresa } from "./shared/empresaScope";

export class SupabasePagoRepository implements PagoRepository {
  async getAll(): Promise<Pago[]> {
    const { data, error } = await supabase.from("pagos").select("*");
    if (error) throw error;
    return (data ?? []) as Pago[];
  }

  async getByEmpresaId(empresaId: number): Promise<Pago[]> {
    const cobranzaIds = await getCobranzaIdsForEmpresa(empresaId);
    if (cobranzaIds.length === 0) return [];
    const { data, error } = await supabase.from("pagos").select("*").in("id_cobranza", cobranzaIds);
    if (error) throw error;
    return (data ?? []) as Pago[];
  }

  async getByCobranzaId(cobranzaId: number): Promise<Pago[]> {
    const { data, error } = await supabase.from("pagos").select("*").eq("id_cobranza", cobranzaId);
    if (error) throw error;
    return (data ?? []) as Pago[];
  }

  async getById(id: number): Promise<Pago | null> {
    const { data, error } = await supabase.from("pagos").select("*").eq("id_pago", id).single();
    if (error) return null;
    return data as Pago;
  }

  async create(data: Omit<Pago, "id_pago">): Promise<Pago> {
    const { data: created, error } = await supabase.from("pagos").insert(data).select().single();
    if (error) throw error;
    return created as Pago;
  }
}
