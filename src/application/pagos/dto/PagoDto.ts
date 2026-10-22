import type { FormaPago } from "@/domain/recibo/entities";

export interface PagoDto {
  id_pago: number;
  id_cobranza: number;
  id_usuario: number;
  monto_pagado: number;
  fecha_pago: string;
  forma_pago?: FormaPago;
}
