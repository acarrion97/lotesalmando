import type { Manzana } from "../entities";

export interface ManzanaRepository {
  getAll(): Promise<Manzana[]>;
  getByEtapaId(etapaId: number): Promise<Manzana[]>;
  getById(id: number): Promise<Manzana | null>;
  create(data: Omit<Manzana, "id_manzana">): Promise<Manzana>;
  update(id: number, data: Partial<Manzana>): Promise<Manzana>;
  delete(id: number): Promise<void>;
}
