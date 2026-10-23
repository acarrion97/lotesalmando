import type { Recibo } from "@/domain/recibo/entities";
import type { ReciboRepository } from "@/domain/recibo/repositories";
import type { EmitirReciboPagoPrevio } from "../ports/EmitirReciboPagoPrevio";

/**
 * Emite el recibo de un pago que quedó sin recibo por haberse registrado
 * antes del cambio. Si el pago ya tiene recibo se devuelve tal cual: la
 * secuencia solo avanza cuando se emite un recibo nuevo.
 */
export class EmitirReciboPagoPrevioUseCase {
  private readonly recibos: ReciboRepository;
  private readonly emisor: EmitirReciboPagoPrevio;

  constructor(recibos: ReciboRepository, emisor: EmitirReciboPagoPrevio) {
    this.recibos = recibos;
    this.emisor = emisor;
  }

  async execute(idPago: number): Promise<Recibo> {
    if (!Number.isInteger(idPago) || idPago <= 0) {
      throw new Error("Identificador de pago no válido");
    }
    const existente = await this.recibos.getByPagoId(idPago);
    if (existente) return existente;
    return this.emisor.execute(idPago);
  }
}
