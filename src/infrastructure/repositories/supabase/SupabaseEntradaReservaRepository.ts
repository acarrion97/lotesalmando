import { supabase } from "@/infrastructure/supabase/client";
import type { EntradaReserva } from "@/domain/entrada/entities";
import type { EntradaReservaRepository } from "@/domain/entrada/repositories";

export class SupabaseEntradaReservaRepository implements EntradaReservaRepository {
  async getById(id: number): Promise<EntradaReserva | null> {
    const { data, error } = await supabase
      .from("entradas_reserva")
      .select("*")
      .eq("id_entrada", id)
      .single();
    if (error) return null;
    return data as EntradaReserva;
  }

  async getByLoteId(loteId: number): Promise<EntradaReserva[]> {
    const { data, error } = await supabase
      .from("entradas_reserva")
      .select("*")
      .eq("id_lote", loteId);
    if (error) throw error;
    return (data ?? []) as EntradaReserva[];
  }

  async getByEmpresaId(empresaId: number): Promise<EntradaReserva[]> {
    const { data, error } = await supabase
      .from("entradas_reserva")
      .select("*")
      .eq("id_empresa", empresaId);
    if (error) throw error;
    return (data ?? []) as EntradaReserva[];
  }

  async create(data: Omit<EntradaReserva, "id_entrada" | "created_at">): Promise<EntradaReserva> {
    const { data: created, error } = await supabase
      .from("entradas_reserva")
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return created as EntradaReserva;
  }

  async delete(id: number): Promise<void> {
    const { error } = await supabase.from("entradas_reserva").delete().eq("id_entrada", id);
    if (error) throw error;
  }
}
