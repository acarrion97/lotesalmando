import type { Recibo } from "@/domain/recibo/entities";
import type { ReciboRepository } from "@/domain/recibo/repositories";

export class MockReciboRepository implements ReciboRepository {
  private readonly recibos = new Map<number, Recibo>();

  async getByPagoId(idPago: number): Promise<Recibo | null> {
    return this.recibos.get(idPago) ?? null;
  }

  async getByPagoIds(idsPago: number[]): Promise<Recibo[]> {
    return idsPago.flatMap((idPago) => {
      const recibo = this.recibos.get(idPago);
      return recibo ? [recibo] : [];
    });
  }

  save(recibo: Recibo): void {
    this.recibos.set(recibo.id_pago, recibo);
  }
}
