import type { Pago } from "@/domain/pago/entities";
import type { FormaPago } from "@/domain/recibo/entities";

export interface ActualizarPagoInput {
  id_pago: number;
  monto_pagado: number;
  fecha_pago: string;
  forma_pago: FormaPago;
  id_usuario: number;
}

export interface PagoActualizado {
  pago: Pago;
  /** true si el pago ya tiene recibo emitido: ese recibo no se regenera solo. */
  tiene_recibo: boolean;
  /**
   * Estado en el que quedó la cuota tras recalcular: si el monto corregido ya
   * no cubre la cuota, deja de estar 'pagada'.
   */
  estado_cuota: string;
}

/**
 * Corrección de un pago cargado por equivocación (monto, fecha y forma de
 * pago). Va como RPC (`editar_pago`, migración 048) para que el cambio, el
 * recálculo de la cuota y el aviso del recibo salgan en una sola transacción.
 */
export interface ActualizarPagoPort {
  execute(input: ActualizarPagoInput): Promise<PagoActualizado>;
}
