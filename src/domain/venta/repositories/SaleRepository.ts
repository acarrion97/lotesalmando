import type { Venta } from "../entities";

export interface SaleRepository {
  getAll(): Promise<Venta[]>;
  getByEmpresaId(empresaId: number): Promise<Venta[]>;
  getById(id: number): Promise<Venta | null>;
  /** Todas las ventas de un cliente (al eliminarlo se borran juntas). */
  getByClienteId(clienteId: number): Promise<Venta[]>;
  create(data: Omit<Venta, "id_venta">): Promise<Venta>;
  update(id: number, data: Partial<Venta>): Promise<Venta>;
  delete(id: number): Promise<void>;
}
