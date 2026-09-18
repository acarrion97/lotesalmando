import type { Venta } from "@/domain/venta/entities";
import type { SaleRepository } from "@/domain/venta/repositories";
import { ventas } from "@/mocks/ventas.mock";

export class MockSaleRepository implements SaleRepository {
  private data: Venta[] = [...ventas];

  async getAll(): Promise<Venta[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Venta[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Venta | null> {
    return this.data.find((v) => v.id_venta === id) ?? null;
  }

  async create(data: Omit<Venta, "id_venta">): Promise<Venta> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((v) => v.id_venta)) + 1 : 1;
    const venta: Venta = { ...data, id_venta: newId };
    this.data.push(venta);
    return venta;
  }

  async update(id: number, data: Partial<Venta>): Promise<Venta> {
    const index = this.data.findIndex((v) => v.id_venta === id);
    if (index === -1) throw new Error(`Venta ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_venta: id };
    return this.data[index];
  }
}
