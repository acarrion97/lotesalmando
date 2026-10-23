import type { Recibo } from "@/domain/recibo/entities";
import type { ReciboRepository } from "@/domain/recibo/repositories";

export class MockReciboRepository implements ReciboRepository {
  private readonly recibos = new Map<number, Recibo>();
  private secuencia = 0;

  /**
   * Reserva el próximo número de secuencia del modo demo. Es el equivalente
   * al `UPDATE recibo_secuencias ... RETURNING` de la base: todos los
   * recibos (confirmación normal o emisión de un pago viejo) pasan por acá
   * para no repetir números.
   */
  siguienteSecuencia(): number {
    this.secuencia += 1;
    return this.secuencia;
  }

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
