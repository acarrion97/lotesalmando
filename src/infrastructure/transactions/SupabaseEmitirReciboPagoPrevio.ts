import type { Recibo } from "@/domain/recibo/entities";
import type { EmitirReciboPagoPrevio } from "@/application/recibos/ports/EmitirReciboPagoPrevio";
import { supabase } from "@/infrastructure/supabase/client";

/**
 * Emite el recibo de un pago anterior al cambio vía la RPC 044. La
 * validación de empresa, configuración fiscal e identificación vive en la
 * base (misma función que usa la confirmación normal del pago).
 */
export class SupabaseEmitirReciboPagoPrevio implements EmitirReciboPagoPrevio {
  async execute(idPago: number): Promise<Recibo> {
    const { data, error } = await supabase.rpc("emitir_recibo_pago_previo", {
      p_id_pago: idPago,
    });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object") {
      throw new Error("No se pudo emitir el recibo del pago");
    }
    return data as Recibo;
  }
}
