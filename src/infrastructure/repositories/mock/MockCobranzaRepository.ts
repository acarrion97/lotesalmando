import type { Cobranza, CobranzaEstado } from "@/domain/cobranza/entities";
import type { CobranzaRepository } from "@/domain/cobranza/repositories";
import { cobranzas } from "@/mocks/cobranzas.mock";

export class MockCobranzaRepository implements CobranzaRepository {
  private data: Cobranza[] = [...cobranzas] as any;

  async getAll(): Promise<Cobranza[]> {
    return [...this.data];
  }

  async getByContratoId(contratoId: number): Promise<Cobranza[]> {
    return this.data.filter((c) => c.id_contrato === contratoId);
  }

  async getById(id: number): Promise<Cobranza | null> {
    return this.data.find((c) => c.id_cobranza === id) ?? null;
  }

  async create(data: Omit<Cobranza, "id_cobranza">): Promise<Cobranza> {
    const newId = this.data.length > 0 ? Math.max(...this.data.map((c) => c.id_cobranza)) + 1 : 1;
    const cobranza: Cobranza = { ...data, id_cobranza: newId };
    this.data.push(cobranza);
    return cobranza;
  }

  async updateEstado(id: number, estado: CobranzaEstado): Promise<Cobranza> {
    const index = this.data.findIndex((c) => c.id_cobranza === id);
    if (index === -1) throw new Error(`Cobranza ${id} not found`);
    this.data[index] = { ...this.data[index], estado };
    return this.data[index];
  }

  async getVencidas(): Promise<Cobranza[]> {
    return this.data.filter((c) => c.estado === "vencida");
  }
}
