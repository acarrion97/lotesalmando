import type { Etapa } from "../entities";

export interface EtapaRepository {
  getAll(): Promise<Etapa[]>;
  getByEmpresaId(empresaId: number): Promise<Etapa[]>;
  getByProyectoId(proyectoId: number): Promise<Etapa[]>;
  getById(id: number): Promise<Etapa | null>;
  create(data: Omit<Etapa, "id_etapa">): Promise<Etapa>;
  update(id: number, data: Partial<Etapa>): Promise<Etapa>;
  delete(id: number): Promise<void>;
}
