import type { Cotizacion } from "@/domain/cotizacion/entities";
import type { CotizacionRepository } from "@/domain/cotizacion/repositories";
import { cotizaciones } from "@/mocks/cotizaciones.mock";

export class MockCotizacionRepository implements CotizacionRepository {
  private data: Cotizacion[] = [...cotizaciones];

  async getAll(): Promise<Cotizacion[]> {
    return [...this.data];
  }

  async getById(id: number): Promise<Cotizacion | null> {
    return this.data.find((c) => c.id_cotizacion === id) ?? null;
  }

  async create(data: Omit<Cotizacion, "id_cotizacion">): Promise<Cotizacion> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_cotizacion)) + 1 : 1;
    const cotizacion: Cotizacion = { ...data, id_cotizacion: newId };
    this.data.push(cotizacion);
    return cotizacion;
  }

  async update(id: number, data: Partial<Cotizacion>): Promise<Cotizacion> {
    const index = this.data.findIndex((c) => c.id_cotizacion === id);
    if (index === -1) throw new Error(`Cotizacion ${id} not found`);
    this.data[index] = { ...this.data[index], ...data, id_cotizacion: id };
    return this.data[index];
  }
}
