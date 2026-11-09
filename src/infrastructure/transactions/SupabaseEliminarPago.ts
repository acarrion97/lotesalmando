import type { EliminarPagoInput, EliminarPagoPort, PagoEliminado } from "@/application/pagos/ports/EliminarPago";
import { supabase } from "@/infrastructure/supabase/client";

export class SupabaseEliminarPago implements EliminarPagoPort {
  async execute(input: EliminarPagoInput): Promise<PagoEliminado> {
    const { data, error } = await supabase.rpc("eliminar_pago", {
      p_id_pago: input.id_pago,
      p_motivo: input.motivo,
      p_id_usuario: input.id_usuario,
    });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object") {
      throw new Error("La eliminación del pago no devolvió resultado");
    }

    const resultado = data as {
      id_pago?: number;
      id_cobranza?: number;
      recibo_eliminado?: boolean;
      estado_cuota?: string | null;
    };
    if (resultado.id_pago === undefined || resultado.id_cobranza === undefined) {
      throw new Error("La eliminación del pago no devolvió resultado");
    }

    return {
      id_pago: resultado.id_pago,
      id_cobranza: resultado.id_cobranza,
      recibo_eliminado: Boolean(resultado.recibo_eliminado),
      estado_cuota: resultado.estado_cuota ?? null,
    };
  }
}
