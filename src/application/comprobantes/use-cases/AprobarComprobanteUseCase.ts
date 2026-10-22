import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { FormaPago } from "@/domain/recibo/entities";
import type { ConfirmarPagoConRecibo } from "@/application/recibos/ports/ConfirmarPagoConRecibo";

export class AprobarComprobanteUseCase {
  private readonly comprobantes: ComprobanteRepository;
  private readonly cobranzas: CobranzaRepository;
  private readonly confirmarPago: ConfirmarPagoConRecibo;

  constructor(
    comprobantes: ComprobanteRepository,
    cobranzas: CobranzaRepository,
    confirmarPago: ConfirmarPagoConRecibo,
  ) {
    this.comprobantes = comprobantes;
    this.cobranzas = cobranzas;
    this.confirmarPago = confirmarPago;
  }

  async execute(idComprobante: number, idUsuario: number, formaPago: FormaPago) {
    const comprobante = await this.comprobantes.getById(idComprobante);
    if (!comprobante) throw new Error("No existe ese comprobante");
    if (comprobante.estado === "aprobado") throw new Error("Ese comprobante ya fue aprobado");

    const cobranza = await this.cobranzas.getById(comprobante.id_cobranza);
    if (!cobranza) throw new Error("No encontramos la cuota de ese comprobante");
    if (cobranza.estado === "pagada") throw new Error("Esa cuota ya figura como pagada");

    return this.confirmarPago.execute({
      id_comprobante: idComprobante,
      id_cobranza: comprobante.id_cobranza,
      id_usuario: idUsuario,
      monto_pagado: comprobante.monto_pagado,
      fecha_pago: new Date().toISOString().slice(0, 10),
      forma_pago: formaPago,
    });
  }
}
