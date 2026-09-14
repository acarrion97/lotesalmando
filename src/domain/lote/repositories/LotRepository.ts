import type { Lote, LoteEstado } from "../entities";

export interface LotRepository {
  getAll(): Promise<Lote[]>;
  getByManzanaId(manzanaId: number): Promise<Lote[]>;
  getAvailableByManzanaId(manzanaId: number): Promise<Lote[]>;
  getById(id: number): Promise<Lote | null>;
  create(data: Omit<Lote, "id_lote">): Promise<Lote>;
  update(id: number, data: Partial<Lote>): Promise<Lote>;
  updateEstado(id: number, estado: LoteEstado): Promise<Lote>;
  delete(id: number): Promise<void>;
}
