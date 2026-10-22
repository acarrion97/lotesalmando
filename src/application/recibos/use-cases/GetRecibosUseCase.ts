import type { ReciboRepository } from "@/domain/recibo/repositories";

export class GetRecibosUseCase {
  constructor(private readonly recibos: ReciboRepository) {}

  async execute(idsPago: number[]) {
    const idsValidos = [...new Set(idsPago.filter((id) => Number.isInteger(id) && id > 0))];
    if (idsValidos.length === 0) return [];
    return this.recibos.getByPagoIds(idsValidos);
  }
}
