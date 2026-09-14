import type { Cobranza, CobranzaEstado } from "../entities";

export interface CobranzaRepository {
  getAll(): Promise<Cobranza[]>;
  getByContratoId(contratoId: number): Promise<Cobranza[]>;
  getById(id: number): Promise<Cobranza | null>;
  create(data: Omit<Cobranza, "id_cobranza">): Promise<Cobranza>;
  updateEstado(id: number, estado: CobranzaEstado): Promise<Cobranza>;
}
