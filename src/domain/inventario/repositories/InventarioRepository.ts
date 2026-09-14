import type { Inventario } from "../entities";

export interface InventarioRepository {
  getAll(): Promise<Inventario[]>;
  getByLoteId(loteId: number): Promise<Inventario[]>;
  create(data: Omit<Inventario, "id_inventario">): Promise<Inventario>;
}
