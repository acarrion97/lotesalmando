import type { Lote, LoteEstado } from "@/domain/lote/entities";
import type { LotRepository } from "@/domain/lote/repositories";
import { lotes } from "@/mocks/lotes.mock";

const VALID_TRANSITIONS: Record<LoteEstado, LoteEstado[]> = {
  disponible: ["reservado"],
  reservado: ["disponible", "vendido"],
  vendido: [],
  en_negociacion: ["disponible", "reservado"],
  bloqueado: ["disponible"],
  no_disponible: ["disponible"],
};

export class MockLotRepository implements LotRepository {
  private data: Lote[] = [...lotes];

  async getAll(): Promise<Lote[]> {
    return [...this.data];
  }

  async getByManzanaId(manzanaId: number): Promise<Lote[]> {
    return this.data.filter((l) => l.id_manzana === manzanaId);
  }

  async getAvailableByManzanaId(manzanaId: number): Promise<Lote[]> {
    return this.data.filter((l) => l.id_manzana === manzanaId && l.estado === "disponible");
  }

  async getById(id: number): Promise<Lote | null> {
    return this.data.find((l) => l.id_lote === id) ?? null;
  }

  async create(data: Omit<Lote, "id_lote">): Promise<Lote> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((l) => l.id_lote)) + 1 : 1;
    const lote: Lote = { ...data, id_lote: newId };
    this.data.push(lote);
    return lote;
  }

  async update(id: number, data: Partial<Lote>): Promise<Lote> {
    const index = this.data.findIndex((l) => l.id_lote === id);
    if (index === -1) throw new Error(`Lote ${id} not found`);

    this.data[index] = { ...this.data[index], ...data, id_lote: id };
    return this.data[index];
  }

  async updateEstado(id: number, estado: LoteEstado): Promise<Lote> {
    const index = this.data.findIndex((l) => l.id_lote === id);
    if (index === -1) throw new Error(`Lote ${id} not found`);

    const current = this.data[index];
    const allowed = VALID_TRANSITIONS[current.estado];
    if (!allowed.includes(estado)) {
      throw new Error(`Cannot transition lote ${id} from "${current.estado}" to "${estado}"`);
    }

    this.data[index] = { ...current, estado };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((l) => l.id_lote !== id);
  }
}
