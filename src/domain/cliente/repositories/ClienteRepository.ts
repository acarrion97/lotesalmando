import type { Cliente } from "../entities";

export interface ClienteRepository {
  getAll(): Promise<Cliente[]>;
  getByEmpresaId(empresaId: number): Promise<Cliente[]>;
  getById(id: number): Promise<Cliente | null>;
  create(data: Omit<Cliente, "id_cliente">): Promise<Cliente>;
  update(id: number, data: Partial<Cliente>): Promise<Cliente>;
  delete(id: number): Promise<void>;
}
