import type { ReciboRepository } from "@/domain/recibo/repositories";

export class GetRecibosUseCase {
  private readonly recibos: ReciboRepository;

  constructor(recibos: ReciboRepository) {
    this.recibos = recibos;
  }

  async execute(idsPago: number[]) {
    const idsValidos = [...new Set(idsPago.filter((id) => Number.isInteger(id) && id > 0))];
    if (idsValidos.length === 0) return [];
    return this.recibos.getByPagoIds(idsValidos);
  }
}
