import type { Empresa } from "../entities";

export interface EmpresaRepository {
  getAll(): Promise<Empresa[]>;
  getById(id: number): Promise<Empresa | null>;
  create(data: Omit<Empresa, "id_empresa">): Promise<Empresa>;
  update(id: number, data: Partial<Empresa>): Promise<Empresa>;
  delete(id: number): Promise<void>;
}
