import type { Contrato } from "../entities";

export interface ContractRepository {
  getAll(): Promise<Contrato[]>;
  getById(id: number): Promise<Contrato | null>;
  getByVentaId(ventaId: number): Promise<Contrato | null>;
  create(data: Omit<Contrato, "id_contrato">): Promise<Contrato>;
}
