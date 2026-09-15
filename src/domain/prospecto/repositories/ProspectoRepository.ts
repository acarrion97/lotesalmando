import type { Prospecto } from "../entities";

export interface ProspectoRepository {
  getAll(): Promise<Prospecto[]>;
  getByEmpresaId(empresaId: number): Promise<Prospecto[]>;
  getById(id: number): Promise<Prospecto | null>;
  create(data: Omit<Prospecto, "id_prospecto" | "created_at">): Promise<Prospecto>;
  update(id: number, data: Partial<Prospecto>): Promise<Prospecto>;
  delete(id: number): Promise<void>;
}
