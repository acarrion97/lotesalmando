import type { Recibo } from "../entities";

export interface ReciboRepository {
  getByPagoId(idPago: number): Promise<Recibo | null>;
  getByPagoIds(idsPago: number[]): Promise<Recibo[]>;
}
