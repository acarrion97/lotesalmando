import type { FormaPago, Recibo } from "@/domain/recibo/entities";
import type { Pago } from "@/domain/pago/entities";
import type { Comprobante } from "@/domain/comprobante/entities";

export interface ConfirmarPagoConReciboInput {
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
  forma_pago: FormaPago;
  id_comprobante?: number;
}

export interface PagoConfirmadoConRecibo {
  pago: Pago;
  recibo: Recibo;
  comprobante: Comprobante | null;
}

export interface ConfirmarPagoConRecibo {
  execute(input: ConfirmarPagoConReciboInput): Promise<PagoConfirmadoConRecibo>;
}
