import type { Comprobante } from "@/domain/comprobante/entities";
import type { ComprobanteRepository } from "@/domain/comprobante/repositories";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import type { PagoRepository } from "@/domain/pago/repositories";

/**
 * Aprueba un comprobante revisado: deja el comprobante en `aprobado`,
 * registra el pago con el monto que declaró el cliente y pasa la cuota a
 * `pagada`. Es el mismo efecto que `RegistrarPagoModal`, pero partiendo
 * de la prueba que subió el cliente.
 */
export class AprobarComprobanteUseCase {
  private comprobantes: ComprobanteRepository;
  private cobranzas: CobranzaRepository;
  private pagos: PagoRepository;

  constructor(
    comprobantes: ComprobanteRepository,
    cobranzas: CobranzaRepository,
    pagos: PagoRepository,
  ) {
    this.comprobantes = comprobantes;
    this.cobranzas = cobranzas;
    this.pagos = pagos;
  }

  async execute(idComprobante: number, idUsuario: number): Promise<Comprobante> {
    const comprobante = await this.comprobantes.getById(idComprobante);
    if (!comprobante) throw new Error("No existe ese comprobante");
    if (comprobante.estado === "aprobado") throw new Error("Ese comprobante ya fue aprobado");

    const cobranza = await this.cobranzas.getById(comprobante.id_cobranza);
    if (!cobranza) throw new Error("No encontramos la cuota de ese comprobante");
    if (cobranza.estado === "pagada") throw new Error("Esa cuota ya figura como pagada");

    const revisado = await this.comprobantes.revisar(idComprobante, { estado: "aprobado" }, idUsuario);

    await this.pagos.create({
      id_cobranza: comprobante.id_cobranza,
      id_usuario: idUsuario,
      monto_pagado: comprobante.monto_pagado,
      fecha_pago: new Date().toISOString().slice(0, 10),
    });
    await this.cobranzas.updateEstado(comprobante.id_cobranza, "pagada");

    return revisado;
  }
}
