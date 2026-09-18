import type { Etapa } from "@/domain/etapa/entities";
import type { EtapaRepository } from "@/domain/etapa/repositories";
import { etapas } from "@/mocks/etapas.mock";

export class MockEtapaRepository implements EtapaRepository {
  private data: Etapa[] = [...etapas];

  async getAll(): Promise<Etapa[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Etapa[]> {
    return [...this.data];
  }

  async getByProyectoId(proyectoId: number): Promise<Etapa[]> {
    return this.data.filter((e) => e.id_proyecto === proyectoId);
  }

  async getById(id: number): Promise<Etapa | null> {
    return this.data.find((e) => e.id_etapa === id) ?? null;
  }

  async create(data: Omit<Etapa, "id_etapa">): Promise<Etapa> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((e) => e.id_etapa)) + 1 : 1;
    const etapa: Etapa = { ...data, id_etapa: newId };
    this.data.push(etapa);
    return etapa;
  }

  async update(id: number, data: Partial<Etapa>): Promise<Etapa> {
    const index = this.data.findIndex((e) => e.id_etapa === id);
    if (index === -1) throw new Error(`Etapa ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_etapa: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((e) => e.id_etapa !== id);
  }
}
