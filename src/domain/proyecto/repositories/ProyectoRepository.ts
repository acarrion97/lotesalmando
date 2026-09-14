import type { Proyecto } from "../entities";

export interface ProyectoRepository {
  getAll(): Promise<Proyecto[]>;
  getByEmpresaId(empresaId: number): Promise<Proyecto[]>;
  getById(id: number): Promise<Proyecto | null>;
  create(data: Omit<Proyecto, "id_proyecto">): Promise<Proyecto>;
  update(id: number, data: Partial<Proyecto>): Promise<Proyecto>;
  delete(id: number): Promise<void>;
}
