import type { Inventario } from "../entities";

export interface InventarioRepository {
  getAll(): Promise<Inventario[]>;
  getByLoteId(loteId: number): Promise<Inventario[]>;
  getById(id: number): Promise<Inventario | null>;
  create(data: Omit<Inventario, "id_inventario">): Promise<Inventario>;
  update(id: number, data: Partial<Inventario>): Promise<Inventario>;
  delete(id: number): Promise<void>;
}
