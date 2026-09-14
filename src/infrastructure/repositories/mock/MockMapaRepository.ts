import type { Mapa } from "@/domain/mapa/entities";
import type { MapaRepository } from "@/domain/mapa/repositories";
import { mapas } from "@/mocks/mapas.mock";

export class MockMapaRepository implements MapaRepository {
  private data: Mapa[] = [...mapas];

  async getAll(): Promise<Mapa[]> {
    return [...this.data];
  }

  async getByProyectoId(proyectoId: number): Promise<Mapa[]> {
    return this.data.filter((m) => m.id_proyecto === proyectoId);
  }

  async getById(id: number): Promise<Mapa | null> {
    return this.data.find((m) => m.id_mapa === id) ?? null;
  }

  async create(data: Omit<Mapa, "id_mapa">): Promise<Mapa> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((m) => m.id_mapa)) + 1 : 1;
    const mapa: Mapa = { ...data, id_mapa: newId };
    this.data.push(mapa);
    return mapa;
  }

  async update(id: number, data: Partial<Mapa>): Promise<Mapa> {
    const index = this.data.findIndex((m) => m.id_mapa === id);
    if (index === -1) throw new Error(`Mapa ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_mapa: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((m) => m.id_mapa !== id);
  }
}
