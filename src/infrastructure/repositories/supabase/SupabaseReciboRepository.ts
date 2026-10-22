import type { Recibo } from "@/domain/recibo/entities";
import type { ReciboRepository } from "@/domain/recibo/repositories";
import { supabase } from "@/infrastructure/supabase/client";

export class SupabaseReciboRepository implements ReciboRepository {
  async getByPagoId(idPago: number): Promise<Recibo | null> {
    const recibos = await this.getByPagoIds([idPago]);
    return recibos[0] ?? null;
  }

  async getByPagoIds(idsPago: number[]): Promise<Recibo[]> {
    const { data, error } = await supabase.rpc("get_recibos_por_pagos", {
      p_ids_pago: idsPago,
    });
    if (error) throw error;
    return (data ?? []) as Recibo[];
  }
}
