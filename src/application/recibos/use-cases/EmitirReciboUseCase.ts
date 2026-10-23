import type { ReciboRepository } from "@/domain/recibo/repositories";

export class EmitirReciboUseCase {
  private readonly recibos: ReciboRepository;

  constructor(recibos: ReciboRepository) {
    this.recibos = recibos;
  }

  async execute(idPago: number) {
    if (!Number.isInteger(idPago) || idPago <= 0) {
      throw new Error("Identificador de pago no válido");
    }
    const recibo = await this.recibos.getByPagoId(idPago);
    if (!recibo) throw new Error("Este pago todavía no tiene un recibo emitido");
    return recibo;
  }
}
