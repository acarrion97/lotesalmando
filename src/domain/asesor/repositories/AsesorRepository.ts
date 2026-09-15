import type { Asesor } from "../entities";

export interface AsesorRepository {
  getAll(): Promise<Asesor[]>;
  getByEmpresaId(empresaId: number): Promise<Asesor[]>;
  getById(id: number): Promise<Asesor | null>;
  create(data: Omit<Asesor, "id_asesor" | "created_at">): Promise<Asesor>;
  update(id: number, data: Partial<Asesor>): Promise<Asesor>;
  delete(id: number): Promise<void>;
}
