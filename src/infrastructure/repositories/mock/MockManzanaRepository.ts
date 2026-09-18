import type { Manzana } from "@/domain/manzana/entities";
import type { ManzanaRepository } from "@/domain/manzana/repositories";
import { manzanas } from "@/mocks/manzanas.mock";

export class MockManzanaRepository implements ManzanaRepository {
  private data: Manzana[] = [...manzanas];

  async getAll(): Promise<Manzana[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Manzana[]> {
    return [...this.data];
  }

  async getByEtapaId(etapaId: number): Promise<Manzana[]> {
    return this.data.filter((m) => m.id_etapa === etapaId);
  }

  async getById(id: number): Promise<Manzana | null> {
    return this.data.find((m) => m.id_manzana === id) ?? null;
  }

  async create(data: Omit<Manzana, "id_manzana">): Promise<Manzana> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((m) => m.id_manzana)) + 1 : 1;
    const manzana: Manzana = { ...data, id_manzana: newId };
    this.data.push(manzana);
    return manzana;
  }

  async update(id: number, data: Partial<Manzana>): Promise<Manzana> {
    const index = this.data.findIndex((m) => m.id_manzana === id);
    if (index === -1) throw new Error(`Manzana ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_manzana: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((m) => m.id_manzana !== id);
  }
}
