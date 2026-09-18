import type { Inventario } from "@/domain/inventario/entities";
import type { InventarioRepository } from "@/domain/inventario/repositories";
import { inventario } from "@/mocks/inventario.mock";

export class MockInventarioRepository implements InventarioRepository {
  private data: Inventario[] = [...inventario];

  async getAll(): Promise<Inventario[]> {
    return [...this.data];
  }

  async getByLoteId(loteId: number): Promise<Inventario[]> {
    return this.data.filter((i) => i.id_lote === loteId);
  }

  async create(data: Omit<Inventario, "id_inventario">): Promise<Inventario> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((i) => i.id_inventario)) + 1 : 1;
    const item: Inventario = { ...data, id_inventario: newId };
    this.data.push(item);
    return item;
  }

  async getById(id: number): Promise<Inventario | null> {
    return this.data.find((i) => i.id_inventario === id) ?? null;
  }

  async update(id: number, data: Partial<Inventario>): Promise<Inventario> {
    const index = this.data.findIndex((i) => i.id_inventario === id);
    if (index === -1) throw new Error("Inventario no encontrado");
    this.data[index] = { ...this.data[index], ...data };
    return this.data[index];
  }

  async delete(id: number): Promise<void> {
    const index = this.data.findIndex((i) => i.id_inventario === id);
    if (index === -1) throw new Error("Inventario no encontrado");
    this.data.splice(index, 1);
  }
}
