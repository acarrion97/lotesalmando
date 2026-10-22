import type {
  ConfirmarPagoConRecibo,
  ConfirmarPagoConReciboInput,
  PagoConfirmadoConRecibo,
} from "@/application/recibos/ports/ConfirmarPagoConRecibo";
import { supabase } from "@/infrastructure/supabase/client";

export class SupabaseConfirmarPagoConRecibo implements ConfirmarPagoConRecibo {
  async execute(input: ConfirmarPagoConReciboInput): Promise<PagoConfirmadoConRecibo> {
    const { data, error } = await supabase.rpc("confirmar_pago_con_recibo", {
      p_id_cobranza: input.id_cobranza,
      p_id_usuario: input.id_usuario,
      p_monto_pagado: input.monto_pagado,
      p_fecha_pago: input.fecha_pago.slice(0, 10),
      p_forma_pago: input.forma_pago,
      p_id_comprobante: input.id_comprobante ?? null,
    });
    if (error) throw new Error(error.message);
    if (!data || typeof data !== "object") {
      throw new Error("La confirmación del pago no devolvió el recibo esperado");
    }

    const resultado = data as {
      pago?: PagoConfirmadoConRecibo["pago"];
      recibo?: PagoConfirmadoConRecibo["recibo"];
      comprobante?: PagoConfirmadoConRecibo["comprobante"];
    };
    if (!resultado.pago || !resultado.recibo) {
      throw new Error("La confirmación del pago no devolvió el recibo esperado");
    }

    return {
      pago: resultado.pago,
      recibo: resultado.recibo,
      comprobante: resultado.comprobante ?? null,
    };
  }
}
