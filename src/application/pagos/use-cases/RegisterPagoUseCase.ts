import type { Pago } from "@/domain/pago/entities";
import type { PagoDto } from "../dto/PagoDto";
import type { FormaPago, Recibo } from "@/domain/recibo/entities";
import type { ConfirmarPagoConRecibo } from "@/application/recibos/ports/ConfirmarPagoConRecibo";

export class RegisterPagoUseCase {
  private readonly confirmarPago: ConfirmarPagoConRecibo;

  constructor(confirmarPago: ConfirmarPagoConRecibo) {
    this.confirmarPago = confirmarPago;
  }

  async execute(data: {
    id_cobranza: number;
    id_usuario: number;
    monto_pagado: number;
    fecha_pago: string;
    forma_pago: FormaPago;
  }): Promise<PagoDto & { recibo: Recibo }> {
    const { pago, recibo } = await this.confirmarPago.execute(data);
    return { ...this.toDto(pago), recibo };
  }

  private toDto(pago: Pago): PagoDto {
    return {
      id_pago: pago.id_pago,
      id_cobranza: pago.id_cobranza,
      id_usuario: pago.id_usuario,
      monto_pagado: pago.monto_pagado,
      fecha_pago: pago.fecha_pago,
      forma_pago: pago.forma_pago,
    };
  }
}
