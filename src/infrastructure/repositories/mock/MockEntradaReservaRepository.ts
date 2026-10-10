import type { EntradaReserva } from "@/domain/entrada/entities";
import type { EntradaReservaRepository } from "@/domain/entrada/repositories";

/**
 * Almacén en memoria de entradas de reserva para el proveedor mock. Arranca
 * vacío: las entradas se generan al confirmar reservas durante la sesión.
 */
export class MockEntradaReservaRepository implements EntradaReservaRepository {
  private data: EntradaReserva[] = [];

  async getById(id: number): Promise<EntradaReserva | null> {
    return this.data.find((e) => e.id_entrada === id) ?? null;
  }

  async getByLoteId(loteId: number): Promise<EntradaReserva[]> {
    return this.data.filter((e) => e.id_lote === loteId);
  }

  async getByEmpresaId(empresaId: number): Promise<EntradaReserva[]> {
    return this.data.filter((e) => e.id_empresa === empresaId);
  }

  async create(data: Omit<EntradaReserva, "id_entrada" | "created_at">): Promise<EntradaReserva> {
    const newId =
      this.data.length > 0 ? Math.max(...this.data.map((e) => e.id_entrada)) + 1 : 1;
    const entrada: EntradaReserva = {
      ...data,
      id_entrada: newId,
      created_at: new Date().toISOString(),
    };
    this.data.push(entrada);
    return entrada;
  }

  async delete(id: number): Promise<void> {
    this.data = this.data.filter((e) => e.id_entrada !== id);
  }
}
