import type {
  ActualizarPagoInput,
  ActualizarPagoPort,
  PagoActualizado,
} from "@/application/pagos/ports/ActualizarPago";
import type { Pago } from "@/domain/pago/entities";
import { supabase } from "@/infrastructure/supabase/client";

export class SupabaseActualizarPago implements ActualizarPagoPort {
  async execute(input: ActualizarPagoInput): Promise<PagoActualizado> {
    const { data, error } = await supabase.rpc("editar_pago", {
      p_id_pago: input.id_pago,
      p_monto_pagado: input.monto_pagado,
      p_fecha_pago: input.fecha_pago.slice(0, 10),
      p_forma_pago: input.forma_pago,
      p_id_usuario: input.id_usuario,
    });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object") {
      throw new Error("La corrección del pago no devolvió resultado");
    }

    const resultado = data as {
      pago?: Pago;
      estado_cuota?: string;
      tiene_recibo?: boolean;
    };
    if (!resultado.pago) {
      throw new Error("La corrección del pago no devolvió resultado");
    }

    return {
      pago: resultado.pago,
      estado_cuota: resultado.estado_cuota ?? "",
      tiene_recibo: Boolean(resultado.tiene_recibo),
    };
  }
}
