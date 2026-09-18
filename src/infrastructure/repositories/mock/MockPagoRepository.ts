import type { Pago } from "@/domain/pago/entities";
import type { PagoRepository } from "@/domain/pago/repositories";
import { pagos } from "@/mocks/pagos.mock";

export class MockPagoRepository implements PagoRepository {
  private data: Pago[] = [...pagos];

  async getAll(): Promise<Pago[]> {
    return [...this.data];
  }

  async getByEmpresaId(_empresaId: number): Promise<Pago[]> {
    return [...this.data];
  }

  async getByCobranzaId(cobranzaId: number): Promise<Pago[]> {
    return this.data.filter((p) => p.id_cobranza === cobranzaId);
  }

  async getById(id: number): Promise<Pago | null> {
    return this.data.find((p) => p.id_pago === id) ?? null;
  }

  async create(data: Omit<Pago, "id_pago">): Promise<Pago> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((p) => p.id_pago)) + 1 : 1;
    const pago: Pago = { ...data, id_pago: newId };
    this.data.push(pago);
    return pago;
  }
}
