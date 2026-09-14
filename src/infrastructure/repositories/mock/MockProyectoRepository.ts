import type { Proyecto } from "@/domain/proyecto/entities";
import type { ProyectoRepository } from "@/domain/proyecto/repositories";
import { proyectos } from "@/mocks/proyectos.mock";

export class MockProyectoRepository implements ProyectoRepository {
  private data: Proyecto[] = [...proyectos];

  async getAll(): Promise<Proyecto[]> {
    return [...this.data];
  }

  async getByEmpresaId(empresaId: number): Promise<Proyecto[]> {
    return this.data.filter((p) => p.id_empresa === empresaId);
  }

  async getById(id: number): Promise<Proyecto | null> {
    return this.data.find((p) => p.id_proyecto === id) ?? null;
  }

  async create(data: Omit<Proyecto, "id_proyecto">): Promise<Proyecto> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((p) => p.id_proyecto)) + 1 : 1;
    const proyecto: Proyecto = { ...data, id_proyecto: newId };
    this.data.push(proyecto);
    return proyecto;
  }

  async update(id: number, data: Partial<Proyecto>): Promise<Proyecto> {
    const index = this.data.findIndex((p) => p.id_proyecto === id);
    if (index === -1) throw new Error(`Proyecto ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_proyecto: id };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((p) => p.id_proyecto !== id);
  }
}
