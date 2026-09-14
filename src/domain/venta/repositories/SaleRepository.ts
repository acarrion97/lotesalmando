import type { Venta } from "../entities";

export interface SaleRepository {
  getAll(): Promise<Venta[]>;
  getById(id: number): Promise<Venta | null>;
  create(data: Omit<Venta, "id_venta">): Promise<Venta>;
  update(id: number, data: Partial<Venta>): Promise<Venta>;
}
